// lib/contractor/job-documents.ts
// Who may see a job document.
//
// THE RULE (plan 14.5)
// A document is visible to someone on the job (owner, lister or accepted crew,
// checked first by getJobWithRole) when they uploaded it, or when it is shared
// (is_shared = true). The role does not widen this: an owner or lister does not
// see a worker's private W-9 or certificate. Someone not on the job sees
// nothing, shared or not.
//
// The same rule is enforced in the database by the job_documents RLS policies
// (supabase/migrations/197_job_documents_member_read.sql) so direct PostgREST
// reads follow it too.
//
// Kept free of '@/' imports so node --test can load it (tests/job-documents.test.ts).

export interface JobDocumentVisibility {
  user_id?: string | null;
  is_shared?: boolean | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * May a member of the job see this document? Call only after confirming the
 * caller is on the job (getJobWithRole); a non-member sees no documents.
 */
export function canSeeJobDocument(
  doc: JobDocumentVisibility | null | undefined,
  callerId: string,
  isJobMember: boolean,
): boolean {
  if (!doc || !callerId || !isJobMember) return false;
  if (doc.user_id && doc.user_id === callerId) return true;
  return doc.is_shared === true;
}

/** The documents a job member may see, in their original order. */
export function visibleJobDocuments<T extends JobDocumentVisibility>(
  docs: readonly T[] | null | undefined,
  callerId: string,
  isJobMember: boolean,
): T[] {
  if (!docs) return [];
  return docs.filter((d) => canSeeJobDocument(d, callerId, isJobMember));
}

/**
 * PostgREST `.or()` filter for "mine or shared". Returns null for a caller id
 * that is not a UUID, so nothing user-controlled reaches the filter string.
 */
export function jobDocumentsOrFilter(callerId: string): string | null {
  if (!UUID_RE.test(callerId)) return null;
  return `user_id.eq.${callerId},is_shared.eq.true`;
}

/**
 * A document link must be http(s). Returns the trimmed URL, null for none, or
 * false for a URL that is refused (javascript:, data:, relative paths...).
 */
export function cleanDocumentUrl(value: unknown): string | null | false {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'https:' || u.protocol === 'http:' ? trimmed : false;
  } catch {
    return false;
  }
}
