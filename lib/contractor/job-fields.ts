// lib/contractor/job-fields.ts
// The foreign ids a contractor job or event body may carry.
//
// Jobs and events are written with the service-role client. Their client, point
// of contact, crew coordinator, venue, event and brand ids are read back later
// (a client's payroll portal, a venue's coordinates and knowledge base), so each
// must be the caller's own. Check them with checkReferences().
//
// A lister may edit a job someone else owns, and the edit form sends every
// field back. changedReferences() checks only the ids the request changes, so a
// lister re-sending the owner's existing venue is not refused, while pointing
// the job at a new record still has to be the lister's own.
//
// Kept free of '@/' imports so node --test can load it (tests/job-fields.test.ts).

import { referencesIn, type Reference, type ReferenceField } from '../auth/ownership.ts';

export const JOB_REFERENCE_FIELDS: readonly ReferenceField[] = [
  { field: 'client_id', table: 'user_contacts' },
  { field: 'poc_contact_id', table: 'user_contacts' },
  { field: 'crew_coordinator_id', table: 'user_contacts' },
  { field: 'location_id', table: 'contact_locations' },
  { field: 'event_id', table: 'contractor_events' },
  { field: 'brand_id', table: 'user_brands' },
];

/** Every reference a job or event body carries. */
export function jobReferences(body: unknown): Reference[] {
  return referencesIn(body, JOB_REFERENCE_FIELDS);
}

/**
 * The references a PATCH body carries whose value differs from the saved row.
 * Unchanged ids were accepted when they were saved (or belong to the job's
 * owner) and are not re-checked.
 */
export function changedReferences(body: unknown, existing: Record<string, unknown> | null | undefined): Reference[] {
  const saved = existing ?? {};
  return jobReferences(body).filter((ref) => ref.id !== saved[ref.field]);
}
