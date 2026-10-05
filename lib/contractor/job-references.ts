// lib/contractor/job-references.ts
// May the signed-in user reference these contractor jobs?
//
// A job id on an invoice, paycheck or time entry is not always the caller's own
// job: an accepted crew member invoices against the owner's job, and a lister
// works jobs they list (lib/contractor/job-access.ts). So the rule for a job
// reference is wider than ownership: owner, lister, or accepted assignee. This
// is the batch form of getJobWithRole, for request bodies and stored ids.
//
// Kept free of '@/' imports so node --test can load it (tests/job-references.test.ts).

import { isUuid, type OwnershipDb, type Reference } from '../auth/ownership.ts';

export interface JobAccess {
  /** Job ids the caller may reference, lower-cased. */
  ids: Set<string>;
  /** Job ids the caller owns, lower-cased. */
  owned: Set<string>;
  /** A lookup failed (answer 500). */
  failed: boolean;
}

/**
 * Of `ids`, the jobs the caller owns, lists, or is an accepted assignee on.
 * Malformed ids never reach the database.
 */
export async function accessibleJobIds(
  db: OwnershipDb,
  userId: string,
  ids: readonly unknown[],
): Promise<JobAccess> {
  const out: JobAccess = { ids: new Set(), owned: new Set(), failed: false };
  const wanted = [...new Set(ids.filter(isUuid).map((id) => id.toLowerCase()))];
  if (!userId || wanted.length === 0) return out;

  const jobs = await db.from('contractor_jobs').select('id, user_id, lister_id').in('id', wanted);
  if (jobs.error) return { ...out, failed: true };
  const rows = (Array.isArray(jobs.data) ? jobs.data : []) as Array<Record<string, unknown>>;
  const unresolved: string[] = [];
  for (const row of rows) {
    if (typeof row.id !== 'string') continue;
    const id = row.id.toLowerCase();
    if (row.user_id === userId) {
      out.ids.add(id);
      out.owned.add(id);
    } else if (row.lister_id === userId) {
      out.ids.add(id);
    } else {
      unresolved.push(id);
    }
  }
  if (unresolved.length === 0) return out;

  const assignments = await db
    .from('contractor_job_assignments')
    .select('job_id, assigned_to, status')
    .in('job_id', unresolved)
    .eq('assigned_to', userId)
    .eq('status', 'accepted');
  if (assignments.error) return { ...out, failed: true };
  for (const row of (Array.isArray(assignments.data) ? assignments.data : []) as Array<Record<string, unknown>>) {
    // Decided again from the row, in case a filter was not applied.
    if (typeof row.job_id === 'string' && row.assigned_to === userId && row.status === 'accepted') {
      out.ids.add(row.job_id.toLowerCase());
    }
  }
  return out;
}

/**
 * Split references into job references (checked here with accessibleJobIds)
 * and the rest (for checkReferences). Returns the fields refused here.
 */
export async function checkJobReferences(
  db: OwnershipDb,
  userId: string,
  references: readonly Reference[],
): Promise<{ invalid: string[]; failed: boolean }> {
  const given = references.filter((ref) => ref.id !== null && ref.id !== undefined && ref.id !== '');
  if (given.length === 0) return { invalid: [], failed: false };
  const access = await accessibleJobIds(db, userId, given.map((ref) => ref.id));
  if (access.failed) return { invalid: [], failed: true };
  const invalid: string[] = [];
  for (const ref of given) {
    const ok = typeof ref.id === 'string' && access.ids.has(ref.id.toLowerCase());
    if (!ok && !invalid.includes(ref.field)) invalid.push(ref.field);
  }
  return { invalid, failed: false };
}
