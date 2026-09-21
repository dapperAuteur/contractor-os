// lib/demo/income-events.ts
// Income events for the demo reset.
//
// WHY THIS EXISTS. The demo seed writes invoices and jobs straight to the database. Live writes go
// through the API routes, which fire income events to CentOS; the seed never did, so after the
// database triggers were dropped (CentOS migration 198) the demo contractor stopped getting
// "Invoice Due" and "Expected Payment" planner tasks. Emitting from here makes the demo account
// behave like a real one without this app writing CentOS's tables.
//
// It also retires the previous seed's rows. clearUserData deletes last night's invoices and jobs,
// but CentOS keeps their income events and tasks, so without retirement every reset would leave
// another set of stale tasks behind (the old triggers left 652 that way). Retiring goes through the
// same signed contract: an inactive invoice event archives its task, an inactive job event likewise.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  emitIncomeEvents,
  incomeEventId,
  invoiceToIncomeEvent,
  jobToIncomeEvent,
  type IncomeEvent,
  type InvoiceLike,
  type JobLike,
} from '@/lib/events/income-emitter';

/** CentOS caps a request at 500 events. */
const BATCH = 500;

/** CentOS syncs one user's tasks in order before replying, so a batch needs longer than a single save. */
const BATCH_TIMEOUT_MS = 30_000;

interface TimeEntryRow {
  job_id: string;
  st_hours: number | null;
  ot_hours: number | null;
  dt_hours: number | null;
  total_hours: number | null;
}

export interface IncomeSourceIds {
  invoiceIds: string[];
  jobIds: string[];
}

/** Read the ids that are about to be cleared, so their events can be retired after reseeding. */
export async function readIncomeSourceIds(db: SupabaseClient, userId: string): Promise<IncomeSourceIds> {
  const [{ data: invoices }, { data: jobs }] = await Promise.all([
    db.from('invoices').select('id').eq('user_id', userId),
    db.from('contractor_jobs').select('id').eq('user_id', userId),
  ]);
  return {
    invoiceIds: (invoices ?? []).map((r) => r.id as string),
    jobIds: (jobs ?? []).map((r) => r.id as string),
  };
}

function retireEvent(userId: string, sourceType: 'invoice' | 'job', sourceId: string, today: string): IncomeEvent {
  return {
    event_id: incomeEventId(sourceType, sourceId),
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId,
    expected_date: today,
    expected_amount: 0,
    // 'cancelled' is what CentOS archives an invoice task on; a job task archives on is_active:false.
    status: 'cancelled',
    is_active: false,
  };
}

/**
 * Emit the reseeded invoices and jobs, and retire the ones the reset just deleted.
 *
 * Returns the emitter's result rather than throwing: a planner task is a convenience, and a failed
 * emit must not turn a successful reseed into a failed reset.
 */
export async function emitDemoIncomeEvents(
  db: SupabaseClient,
  userId: string,
  prior: IncomeSourceIds,
): Promise<{ ok: boolean; sent: number; accepted: number; stubbed?: boolean; error?: string }> {
  const [{ data: invoices }, { data: jobs }] = await Promise.all([
    db.from('invoices')
      .select('id, user_id, direction, status, due_date, invoice_date, total, amount_paid, contact_name, invoice_number, brand_id')
      .eq('user_id', userId),
    db.from('contractor_jobs')
      .select('id, user_id, job_number, client_name, status, est_pay_date, start_date, end_date, pay_rate, ot_rate, dt_rate, rate_type, brand_id')
      .eq('user_id', userId),
  ]);

  const jobIds = (jobs ?? []).map((j) => j.id as string);
  const { data: entries } = jobIds.length
    ? await db.from('job_time_entries').select('job_id, st_hours, ot_hours, dt_hours, total_hours').in('job_id', jobIds)
    : { data: [] };
  const entriesByJob = new Map<string, TimeEntryRow[]>();
  for (const e of (entries ?? []) as TimeEntryRow[]) {
    const list = entriesByJob.get(e.job_id);
    if (list) list.push(e);
    else entriesByJob.set(e.job_id, [e]);
  }

  const today = new Date().toISOString().split('T')[0];
  const current = new Set([...(invoices ?? []).map((i) => i.id as string), ...jobIds]);
  const events: IncomeEvent[] = [
    ...prior.invoiceIds.filter((id) => !current.has(id)).map((id) => retireEvent(userId, 'invoice', id, today)),
    ...prior.jobIds.filter((id) => !current.has(id)).map((id) => retireEvent(userId, 'job', id, today)),
    ...(invoices ?? []).map((inv) => invoiceToIncomeEvent(inv as InvoiceLike)),
    ...(jobs ?? []).map((job) => jobToIncomeEvent(job as JobLike, entriesByJob.get(job.id as string) ?? [])),
  ];

  let accepted = 0;
  for (let i = 0; i < events.length; i += BATCH) {
    const r = await emitIncomeEvents(events.slice(i, i + BATCH), { timeoutMs: BATCH_TIMEOUT_MS });
    if (r.stubbed) return { ok: true, sent: 0, accepted: 0, stubbed: true };
    if (!r.ok) return { ok: false, sent: events.length, accepted, error: r.error ?? `HTTP ${r.status}` };
    accepted += r.accepted ?? 0;
  }
  return { ok: true, sent: events.length, accepted };
}
