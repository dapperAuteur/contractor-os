// lib/finance/paycheck-embeds.ts
// The joined rows a paycheck GET may show the caller.
//
// Paycheck routes read with the service-role client and embed the job (and the
// job's client contact) and each deposit's account through stored ids. An id
// saved before reference checks existed could name someone else's job,
// contact or account. Keep:
//   - the job when the caller owns it, lists it, or is accepted crew on it;
//     the client contact (payroll portal) only when the caller owns the job
//   - a deposit's account only when it is the caller's own
// Select user_id inside each embed so this can decide; it is removed here.
//
// Kept free of '@/' imports so node --test can load it.

import type { OwnershipDb } from '../auth/ownership.ts';
import { accessibleJobIds } from '../contractor/job-references.ts';

type Row = Record<string, unknown>;

function one(value: unknown): Row | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v && typeof v === 'object' ? (v as Row) : null;
}

function withoutOwner(row: Row): Row {
  const { user_id: _owner, ...rest } = row;
  void _owner;
  return rest;
}

/** One paycheck's embeds, filtered, given the jobs the caller may see and owns. */
export function filterPaycheckEmbeds<T extends Row>(
  paycheck: T,
  userId: string,
  jobIds: Set<string>,
  ownedJobIds: Set<string>,
): T {
  const out: Row = { ...paycheck };

  if ('contractor_jobs' in out) {
    const job = one(out.contractor_jobs);
    const jobId = typeof job?.id === 'string' ? job.id.toLowerCase() : null;
    const ownerMatch = !!job && job.user_id === userId;
    // Embeds that do not select the id can only be judged by user_id.
    const visible = !!job && (ownerMatch || (jobId !== null && jobIds.has(jobId)));
    if (!job || !visible) {
      out.contractor_jobs = null;
    } else {
      const ownsJob = ownerMatch || (jobId !== null && ownedJobIds.has(jobId));
      const cleaned = withoutOwner(job);
      if ('user_contacts' in cleaned) {
        const contact = one(cleaned.user_contacts);
        cleaned.user_contacts = ownsJob && contact && contact.user_id === userId ? withoutOwner(contact) : null;
      }
      out.contractor_jobs = cleaned;
    }
  }

  if (Array.isArray(out.paycheck_deposits)) {
    out.paycheck_deposits = (out.paycheck_deposits as Row[]).map((deposit) => {
      if (!deposit || typeof deposit !== 'object' || !('financial_accounts' in deposit)) return deposit;
      const account = one(deposit.financial_accounts);
      return {
        ...deposit,
        financial_accounts: account && account.user_id === userId ? withoutOwner(account) : null,
      };
    });
  }

  return out as T;
}

/** Filter the embeds of one paycheck or a list of them. */
export async function visiblePaycheckEmbeds<T extends Row | Row[]>(
  db: OwnershipDb,
  userId: string,
  data: T,
): Promise<T> {
  const rows = (Array.isArray(data) ? data : [data]) as Row[];
  const jobIds = rows
    .map((row) => one(row.contractor_jobs))
    .filter((job): job is Row => !!job && job.user_id !== userId)
    .map((job) => job.id);
  const access = jobIds.length > 0 ? await accessibleJobIds(db, userId, jobIds) : null;
  // A failed lookup hides the other users' jobs rather than showing them.
  const allowed = access && !access.failed ? access.ids : new Set<string>();
  const owned = access && !access.failed ? access.owned : new Set<string>();
  const filtered = rows.map((row) => filterPaycheckEmbeds(row, userId, allowed, owned));
  return (Array.isArray(data) ? filtered : filtered[0]) as T;
}
