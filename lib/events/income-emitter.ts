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
