// lib/events/income-emitter.ts
// Emitter half of Work.WitUS -> CentOS income events.
//
// Stage 2, Phase 2 of the database split (centenarian-os/plans/55-stage2-db-split.md).
// CentOS's finance forecast and planner used to read `expected_payments`, a VIEW over THIS app's
// `contractor_jobs` and `invoices`. That view cannot survive the two apps moving to separate
// databases, so instead of CentOS reaching into our tables, we push income events to it and it
// keeps a local projection.
//
// Push rather than pull, deliberately: CentOS is offline-first, so it must be able to render the
// planner from local data when this app is unreachable.
//
// Wire format is the ecosystem's standard signed webhook, identical to lib/inbox-sender.ts:
//   X-Witus-Source / X-Witus-Timestamp / X-Witus-Signature: sha256=hex(HMAC(secret, `${ts}.${body}`))

import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Mirrors CentOS's income_events row (migration 196), which mirrors expected_payments. */
export interface IncomeEvent {
  /**
   * Stable, deterministic id: `${source_type}:${source_id}`. CentOS upserts on
   * (user_id, event_id), so re-sending the same logical event UPDATES rather than duplicates.
   * This is what makes at-least-once delivery and the one-time backfill safe together.
   */
  event_id: string;
  user_id: string;
  source_type: 'job' | 'invoice';
  source_id: string;
  /** YYYY-MM-DD. */
  expected_date: string;
  label?: string | null;
  reference_number?: string | null;
  expected_amount: number;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  brand_id?: string | null;
  /** false retires the row (cancelled invoice) without deleting the audit trail. */
  is_active?: boolean;
}

export interface EmitResult {
  ok: boolean;
  /** True when no credentials are configured — dev and preview stay unblocked. */
  stubbed?: boolean;
  accepted?: number;
  status?: number;
  error?: string;
}

export const incomeEventId = (
  sourceType: IncomeEvent['source_type'],
  sourceId: string,
): string => `${sourceType}:${sourceId}`;

function readConfig(): { url: string; secret: string; slug: string } | null {
  const url = process.env.INCOME_EVENTS_URL;
  const secret = process.env.INCOME_EVENTS_SECRET;
  const slug = process.env.INCOME_EVENTS_SOURCE_SLUG ?? 'work_witus';
  if (!url || !secret) return null;
  return { url, secret, slug };
}

/**
 * Send one or more income events to CentOS.
 *
 * NEVER THROWS. An income event is a side effect of an invoice or job update; if CentOS is down,
 * the user's invoice must still save. Failures are returned for the caller to log, and the
 * periodic resync (scripts/resync-income-events.mjs) is what guarantees eventual consistency.
 */
export async function emitIncomeEvents(events: IncomeEvent[]): Promise<EmitResult> {
  if (events.length === 0) return { ok: true, accepted: 0 };

  const cfg = readConfig();
  if (!cfg) {
    // Unconfigured is a normal state in dev and preview, not an error.
    return { ok: true, stubbed: true };
  }

  const rawBody = JSON.stringify({ events });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', cfg.secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Witus-Source': cfg.slug,
        'X-Witus-Timestamp': timestamp,
        'X-Witus-Signature': `sha256=${signature}`,
      },
      body: rawBody,
      // Do not let a slow sibling app hold an invoice save open.
      signal: AbortSignal.timeout(5000),
    });

    const text = await res.text();
    let parsed: { accepted?: number; error?: string } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      /* non-JSON body; fall through to status-based handling */
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: parsed.error ?? text.slice(0, 200) };
    }
    return { ok: true, status: res.status, accepted: parsed.accepted ?? events.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'fetch failed' };
  }
}

/** The subset of an invoice row this module needs. */
export interface InvoiceLike {
  id: string;
  user_id: string;
  direction?: string | null;
  status?: string | null;
  due_date?: string | null;
  invoice_date?: string | null;
  total?: number | string | null;
  amount_paid?: number | string | null;
  contact_name?: string | null;
  invoice_number?: string | null;
  brand_id?: string | null;
}

/**
 * Map an invoice to its income event.
 *
 * `is_active` encodes EXACTLY the predicate the expected_payments view uses:
 *
 *   direction = 'receivable' AND due_date IS NOT NULL AND status IN ('sent','overdue')
 *
 * Keeping the two in lockstep is what lets CentOS swap the view for the projection without any
 * behaviour change. An invoice that falls out of the predicate (paid, cancelled, reverted to
 * draft) is emitted with is_active:false, which retires it from the forecast while preserving
 * the row — the same effect the view achieves by simply not returning it.
 */
export function invoiceToIncomeEvent(inv: InvoiceLike): IncomeEvent {
  const isExpected =
    inv.direction === 'receivable' &&
    !!inv.due_date &&
    (inv.status === 'sent' || inv.status === 'overdue');

  const total = Number(inv.total ?? 0);
  const paid = Number(inv.amount_paid ?? 0);

  return {
    event_id: incomeEventId('invoice', inv.id),
    user_id: inv.user_id,
    source_type: 'invoice',
    source_id: inv.id,
    // due_date is only guaranteed present when isExpected; fall back so the event still
    // carries a valid date and can retire the row.
    expected_date: inv.due_date ?? inv.invoice_date ?? new Date().toISOString().split('T')[0],
    label: inv.contact_name ?? null,
    reference_number: inv.invoice_number ?? null,
    expected_amount: total - paid,
    status: inv.status ?? null,
    start_date: inv.invoice_date ?? null,
    end_date: null,
    brand_id: inv.brand_id ?? null,
    is_active: isExpected,
  };
}

/**
 * Fire-and-forget an invoice's income event. Mirrors the fireOutboxDrafts pattern used
 * elsewhere in this app: the user's write has already succeeded, so a failure here must not
 * change the response. Eventual consistency is guaranteed by the periodic resync script.
 */
export function fireInvoiceIncomeEvent(
  inv: InvoiceLike,
  log?: (msg: string, meta?: Record<string, unknown>) => void,
): void {
  void emitIncomeEvents([invoiceToIncomeEvent(inv)]).then((r) => {
    if (!r.ok && log) {
      log('income event emit failed', { invoice_id: inv.id, error: r.error, status: r.status });
    }
  });
}

/** The subset of a contractor_jobs row needed to compute an expected payment. */
export interface JobLike {
  id: string;
  user_id?: string | null;
  job_number?: string | null;
  client_name?: string | null;
  status?: string | null;
  est_pay_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  pay_rate?: number | string | null;
  ot_rate?: number | string | null;
  dt_rate?: number | string | null;
  rate_type?: string | null;
  brand_id?: string | null;
}

interface TimeEntry {
  st_hours?: number | string | null;
  ot_hours?: number | string | null;
  dt_hours?: number | string | null;
  /**
   * Present on real rows and often the ONLY hours field set — the job UI lets you enter a bare
   * total without splitting it into straight/overtime/double. See computeExpectedAmount.
   */
  total_hours?: number | string | null;
}

const n = (v: unknown): number => {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};

/**
 * Expected payment for a job. Port of the SQL in migration 153's expected_payments view:
 * sum the time entries at straight/overtime/double rates, and if there are none, fall back to
 * the daily or flat estimate.
 *
 * This computation lives HERE rather than in CentOS because job_time_entries is moving to this
 * app's database. CentOS receives the number, not the inputs.
 */
export function computeExpectedAmount(job: JobLike, entries: TimeEntry[]): number {
  const pay = n(job.pay_rate);
  const ot = job.ot_rate == null ? pay * 1.5 : n(job.ot_rate);
  const dt = job.dt_rate == null ? pay * 2 : n(job.dt_rate);

  // st_hours ?? total_hours is deliberate, and it is a correction to the SQL this was ported from.
  // The expected_payments view uses COALESCE(te.st_hours, 0), so an entry logged as a bare
  // total_hours with no split contributes ZERO to the forecast — while
  // jobs/[id]/generate-invoice computes `entry.st_hours ?? entry.total_hours ?? 0` and bills the
  // full amount. Same row, two answers: the invoice says 10 hours, the forecast says $0.
  // Real data hits this: job TEST, 2026-09-07, total_hours 10 with st/ot/dt all NULL.
  // Matching the invoice is the correct side to agree with, since that is what gets billed.
  const fromEntries = entries.reduce(
    (sum, te) =>
      sum + (te.st_hours == null ? n(te.total_hours) : n(te.st_hours)) * pay
          + n(te.ot_hours) * ot
          + n(te.dt_hours) * dt,
    0,
  );
  if (fromEntries > 0) return fromEntries;

  if (job.rate_type === 'daily' && job.start_date && job.end_date) {
    const days = Math.round(
      (Date.parse(job.end_date) - Date.parse(job.start_date)) / 86_400_000,
    ) + 1;
    return pay * Math.max(days, 0);
  }
  if (job.rate_type === 'flat') return pay;
  return 0;
}

/**
 * Map a job to its income event.
 *
 * `is_active` mirrors migration 153's job predicate exactly:
 *   est_pay_date IS NOT NULL AND status IN ('completed','invoiced')
 *
 * A job that falls out of it (paid, cancelled, pay date cleared) is emitted inactive, which
 * retires it from CentOS's forecast and archives its planner task — the same effect the view
 * achieved by not returning the row.
 */
export function jobToIncomeEvent(job: JobLike, entries: TimeEntry[]): IncomeEvent {
  const isExpected =
    !!job.est_pay_date && (job.status === 'completed' || job.status === 'invoiced');

  return {
    event_id: incomeEventId('job', job.id),
    user_id: job.user_id ?? '',
    source_type: 'job',
    source_id: job.id,
    expected_date: job.est_pay_date ?? job.end_date ?? new Date().toISOString().split('T')[0],
    label: job.client_name ?? null,
    reference_number: job.job_number ?? null,
    expected_amount: computeExpectedAmount(job, entries),
    status: job.status ?? null,
    start_date: job.start_date ?? null,
    end_date: job.end_date ?? null,
    brand_id: job.brand_id ?? null,
    is_active: isExpected,
  };
}

/**
 * Fire-and-forget a job's income event. Fetches the job's time entries first, because the amount
 * cannot be computed without them.
 *
 * Nothing emitted job income events before this: the invoice path covered invoices only, so a job
 * with an est_pay_date reached CentOS's projection through the backfill and never through a live
 * write. This closes that gap.
 */
export function fireJobIncomeEvent(
  db: SupabaseClient,
  job: JobLike,
  log?: (msg: string, meta?: Record<string, unknown>) => void,
): void {
  if (!job.user_id) return;
  void (async () => {
    let entries: TimeEntry[] = [];
    try {
      const { data } = await db
        .from('job_time_entries')
        .select('st_hours, ot_hours, dt_hours, total_hours')
        .eq('job_id', job.id);
      entries = (data ?? []) as TimeEntry[];
    } catch {
      // No entries readable — computeExpectedAmount falls back to the rate estimate.
    }
    const r = await emitIncomeEvents([jobToIncomeEvent(job, entries)]);
    if (!r.ok && log) log('job income event emit failed', { job_id: job.id, error: r.error });
  })();
}
