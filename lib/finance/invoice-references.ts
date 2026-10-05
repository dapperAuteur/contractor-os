// lib/finance/invoice-references.ts
// The foreign ids an invoice or invoice template carries.
//
// Invoices and templates are written with the service-role client, and their
// ids are copied onto financial transactions when an invoice is paid or made
// from a template, then read back through joins. Check a request body with
// checkInvoiceReferences(); re-check ids saved before these checks existed
// with usableReferences() before copying them (templates carry no job id).
//
// Contact, account, brand and category must be the caller's own. A job may
// also be one the caller works as lister or accepted crew: a crew member's
// invoice points at the owner's job (contractor/jobs/[id]/generate-invoice).
//
// Kept free of '@/' imports so node --test can load it.

import {
  checkReferences,
  referencesIn,
  type OwnershipDb,
  type Reference,
  type ReferenceCheck,
  type ReferenceField,
} from '../auth/ownership.ts';
import { checkJobReferences } from '../contractor/job-references.ts';

export const INVOICE_REFERENCE_FIELDS: readonly ReferenceField[] = [
  { field: 'contact_id', table: 'user_contacts' },
  { field: 'account_id', table: 'financial_accounts' },
  { field: 'brand_id', table: 'user_brands' },
  { field: 'category_id', table: 'budget_categories' },
  { field: 'job_id', table: 'contractor_jobs' },
];

/** The references an invoice or template body (or a saved row) carries. */
export function invoiceReferences(body: unknown): Reference[] {
  return referencesIn(body, INVOICE_REFERENCE_FIELDS);
}

/**
 * Check references: job ids by job access (owner, lister, accepted crew), every
 * other id by the owner-only rule in lib/auth/ownership.ts.
 */
export async function checkInvoiceReferences(
  db: OwnershipDb,
  userId: string,
  references: readonly Reference[],
): Promise<ReferenceCheck> {
  const jobRefs = references.filter((ref) => ref.table === 'contractor_jobs');
  const otherRefs = references.filter((ref) => ref.table !== 'contractor_jobs');
  const [others, jobs] = await Promise.all([
    checkReferences(db, userId, otherRefs),
    checkJobReferences(db, userId, jobRefs),
  ]);
  const failed = others.failed || jobs.failed;
  const invalid = failed ? [] : [...others.invalid, ...jobs.invalid.filter((f) => !others.invalid.includes(f))];
  return { ok: !failed && invalid.length === 0, invalid, failed };
}
