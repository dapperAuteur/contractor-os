// lib/events/schedule-emitter.ts
// Emitter for Work.WitUS -> CentOS job-SCHEDULE events. Sibling of income-emitter.ts.
//
// Stage 2, Phase 2b of the database split (centenarian-os/plans/55-stage2-db-split.md).
// CentOS's /api/planner/work-feed and /api/planner/availability used to read our
// contractor_jobs and contractor_job_assignments tables directly. They now read a local
// projection that we push to, which is the last coupling to remove before the databases split.
//
// Separate from income events on purpose: income says "money is expected on date X", this says
// "BAM is occupied on date X". Different lifecycles — a job is scheduled long before it is
// invoiced, and a cancelled job leaves the calendar while its invoice may still be owed.

import { createHmac } from 'node:crypto';

export interface ScheduleEvent {
  /** `job:<id>` for an owned job, `assignment:<id>` for an assigned one. Upsert key on the
   *  receiver, so redelivery updates instead of duplicating. */
  event_id: string;
  /** WHOSE calendar this occupies. For an assignment that is the assignee, not the job owner. */
  user_id: string;
  source: 'own' | 'assigned';
  assigner_name?: string | null;
  job_id: string;
  job_number?: string | null;
  client_name?: string | null;
  event_name?: string | null;
  location_name?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_multi_day?: boolean;
  scheduled_dates?: unknown;
  pay_rate?: number | null;
  rate_type?: string | null;
  brand_id?: string | null;
  notes?: string | null;
  /** false retires the row from CentOS's calendar without deleting the audit trail. */
  is_active?: boolean;
}

export interface EmitResult {
  ok: boolean;
  stubbed?: boolean;
  accepted?: number;
  status?: number;
  error?: string;
}

export const scheduleEventId = (kind: 'job' | 'assignment', id: string): string => `${kind}:${id}`;

/** Statuses CentOS's planner has always excluded. Encoded here so the rule lives in one place. */
const HIDDEN_STATUSES = new Set(['cancelled', 'paid']);

/** The subset of a contractor_jobs row this module needs. */
export interface JobLike {
  id: string;
  user_id?: string | null;
  job_number?: string | null;
  client_name?: string | null;
  event_name?: string | null;
  location_name?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_multi_day?: boolean | null;
  scheduled_dates?: unknown;
  pay_rate?: number | string | null;
  rate_type?: string | null;
  brand_id?: string | null;
  notes?: string | null;
}

/**
 * Map a job to a schedule event for one person's calendar.
 *
 * `is_active` mirrors exactly what CentOS's planner filtered on when it read our tables directly
 * (status not in cancelled/paid). Keeping the two in lockstep is what makes the projection a
 * drop-in for the direct reads.
 */
export function jobToScheduleEvent(
  job: JobLike,
  opts: { userId: string; source: 'own' | 'assigned'; assignmentId?: string; assignerName?: string | null },
): ScheduleEvent {
  return {
    event_id: opts.assignmentId
      ? scheduleEventId('assignment', opts.assignmentId)
      : scheduleEventId('job', job.id),
    user_id: opts.userId,
    source: opts.source,
    assigner_name: opts.assignerName ?? null,
    job_id: job.id,
    job_number: job.job_number ?? null,
    client_name: job.client_name ?? null,
    event_name: job.event_name ?? null,
    location_name: job.location_name ?? null,
    status: job.status ?? null,
    start_date: job.start_date ?? null,
    end_date: job.end_date ?? null,
    is_multi_day: job.is_multi_day === true,
    scheduled_dates: job.scheduled_dates ?? null,
    pay_rate: job.pay_rate == null ? null : Number(job.pay_rate),
    rate_type: job.rate_type ?? null,
    brand_id: job.brand_id ?? null,
    notes: job.notes ?? null,
    is_active: !HIDDEN_STATUSES.has(job.status ?? ''),
  };
}

function readConfig(): { url: string; secret: string; slug: string } | null {
  // Derived from the income URL so there is one env var to set, not two pointing at the same host.
  const base = process.env.SCHEDULE_EVENTS_URL
    ?? process.env.INCOME_EVENTS_URL?.replace(/\/income$/, '/work-schedule');
  const secret = process.env.INCOME_EVENTS_SECRET;
  const slug = process.env.INCOME_EVENTS_SOURCE_SLUG ?? 'work_witus';
  if (!base || !secret) return null;
  return { url: base, secret, slug };
}

/**
 * Send schedule events to CentOS. NEVER THROWS — a schedule event is a side effect of a job
 * save and must not be able to fail it. Eventual consistency comes from the resync script.
 */
export async function emitScheduleEvents(events: ScheduleEvent[]): Promise<EmitResult> {
  if (events.length === 0) return { ok: true, accepted: 0 };

  const cfg = readConfig();
  if (!cfg) return { ok: true, stubbed: true };

  const rawBody = JSON.stringify({ events });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', cfg.secret).update(`${timestamp}.${rawBody}`).digest('hex');

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
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    let parsed: { accepted?: number; error?: string } = {};
    try { parsed = JSON.parse(text); } catch { /* non-JSON */ }
    if (!res.ok) return { ok: false, status: res.status, error: parsed.error ?? text.slice(0, 200) };
    return { ok: true, status: res.status, accepted: parsed.accepted ?? events.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'fetch failed' };
  }
}

/** Fire-and-forget a job's schedule event for its owner. */
export function fireJobScheduleEvent(
  job: JobLike,
  log?: (msg: string, meta?: Record<string, unknown>) => void,
): void {
  if (!job.user_id) return;
  void emitScheduleEvents([jobToScheduleEvent(job, { userId: job.user_id, source: 'own' })]).then((r) => {
    if (!r.ok && log) log('schedule event emit failed', { job_id: job.id, error: r.error, status: r.status });
  });
}

/**
 * Retire a deleted job from CentOS's calendar.
 *
 * A DELETE here has no row left to map, so the event is built by hand: same event_id, is_active
 * false. CentOS soft-retires rather than deleting, so the projection keeps the audit trail while
 * the job stops occupying the planner. Without this, deleting a job in Work.WitUS would leave a
 * ghost booking in CentOS until the next resync.
 */
export function fireJobDeletedEvent(
  jobId: string,
  userId: string,
  log?: (msg: string, meta?: Record<string, unknown>) => void,
): void {
  void emitScheduleEvents([{
    event_id: scheduleEventId('job', jobId),
    user_id: userId,
    source: 'own',
    job_id: jobId,
    status: 'deleted',
    // The receiver requires at least one date; the row already exists from an earlier event, and
    // the upsert only needs enough to flip is_active.
    start_date: new Date().toISOString().split('T')[0],
    is_active: false,
  }]).then((r) => {
    if (!r.ok && log) log('job-deleted event emit failed', { job_id: jobId, error: r.error });
  });
}
