// tests/job-references.test.ts
// Run: npm run test:auth
//
// Work.WitUS-specific reference rules: job access for a job id (owner, lister,
// accepted crew; lib/contractor/job-references.ts), invoice references that
// mix job access with owner-only ids (lib/finance/invoice-references.ts), and
// the paycheck embed filter (lib/finance/paycheck-embeds.ts).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OwnershipDb } from '../lib/auth/ownership.ts';
import { accessibleJobIds, checkJobReferences } from '../lib/contractor/job-references.ts';
import { checkInvoiceReferences, invoiceReferences } from '../lib/finance/invoice-references.ts';
import { filterPaycheckEmbeds, visiblePaycheckEmbeds } from '../lib/finance/paycheck-embeds.ts';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const J_OWN = 'aaaaaaaa-0000-4000-8000-000000000001';
const J_LIST = 'aaaaaaaa-0000-4000-8000-000000000002';
const J_CREW = 'aaaaaaaa-0000-4000-8000-000000000003';
const J_PENDING = 'aaaaaaaa-0000-4000-8000-000000000004';
const J_FOREIGN = 'aaaaaaaa-0000-4000-8000-000000000005';
const ACC_MINE = 'bbbbbbbb-0000-4000-8000-000000000001';
const ACC_OTHER = 'bbbbbbbb-0000-4000-8000-000000000002';

type Row = Record<string, unknown>;

const STORE: Record<string, Row[]> = {
  contractor_jobs: [
    { id: J_OWN, user_id: ME, lister_id: null },
    { id: J_LIST, user_id: OTHER, lister_id: ME },
    { id: J_CREW, user_id: OTHER, lister_id: null },
    { id: J_PENDING, user_id: OTHER, lister_id: null },
    { id: J_FOREIGN, user_id: OTHER, lister_id: null },
  ],
  contractor_job_assignments: [
    { job_id: J_CREW, assigned_to: ME, status: 'accepted' },
    { job_id: J_PENDING, assigned_to: ME, status: 'pending' },
    { job_id: J_FOREIGN, assigned_to: OTHER, status: 'accepted' },
  ],
  financial_accounts: [
    { id: ACC_MINE, user_id: ME },
    { id: ACC_OTHER, user_id: OTHER },
  ],
};

/** A fake PostgREST client: .select().in().eq() over STORE. */
function fakeDb(opts: { fail?: string[] } = {}): OwnershipDb & { queries: string[] } {
  const queries: string[] = [];
  return {
    queries,
    from(table: string) {
      return {
        select() {
          const filters: Array<[string, string, unknown]> = [];
          const q = {
            in(column: string, values: readonly string[]) { filters.push(['in', column, values]); return q; },
            eq(column: string, value: string) { filters.push(['eq', column, value]); return q; },
            then(resolve: (r: { data: unknown; error: unknown }) => unknown) {
              queries.push(table);
              if (opts.fail?.includes(table)) return Promise.resolve(resolve({ data: null, error: { message: 'boom' } }));
              const rows = (STORE[table] ?? []).filter((row) =>
                filters.every(([op, column, value]) =>
                  op === 'in' ? (value as string[]).includes(String(row[column])) : row[column] === value,
                ),
              );
              return Promise.resolve(resolve({ data: rows, error: null }));
            },
          };
          return q;
        },
      };
    },
  };
}

test('accessibleJobIds admits owner, lister and accepted crew only', async () => {
  const access = await accessibleJobIds(fakeDb(), ME, [J_OWN, J_LIST, J_CREW, J_PENDING, J_FOREIGN]);
  assert.equal(access.failed, false);
  assert.deepEqual([...access.ids].sort(), [J_OWN, J_LIST, J_CREW].sort());
  assert.deepEqual([...access.owned], [J_OWN]);
});

test('accessibleJobIds never queries for malformed ids or no caller', async () => {
  const db = fakeDb();
  const a = await accessibleJobIds(db, ME, ['not-a-uuid', 42, null]);
  const b = await accessibleJobIds(db, '', [J_OWN]);
  assert.equal(a.ids.size + b.ids.size, 0);
  assert.equal(db.queries.length, 0);
});

test('accessibleJobIds skips the assignment query when every job resolved', async () => {
  const db = fakeDb();
  await accessibleJobIds(db, ME, [J_OWN, J_LIST]);
  assert.deepEqual(db.queries, ['contractor_jobs']);
});

test('accessibleJobIds reports a failed lookup', async () => {
  assert.equal((await accessibleJobIds(fakeDb({ fail: ['contractor_jobs'] }), ME, [J_OWN])).failed, true);
  assert.equal((await accessibleJobIds(fakeDb({ fail: ['contractor_job_assignments'] }), ME, [J_CREW])).failed, true);
});

test('accessibleJobIds is case-insensitive', async () => {
  const access = await accessibleJobIds(fakeDb(), ME, [J_OWN.toUpperCase()]);
  assert.ok(access.ids.has(J_OWN));
});

test('checkJobReferences names refused fields once and skips blanks', async () => {
  const result = await checkJobReferences(fakeDb(), ME, [
    { field: 'job_id', table: 'contractor_jobs', id: J_FOREIGN },
    { field: 'job_id', table: 'contractor_jobs', id: J_PENDING },
    { field: 'other_job', table: 'contractor_jobs', id: '' },
  ]);
  assert.deepEqual(result, { invalid: ['job_id'], failed: false });
});

test('checkInvoiceReferences: crew job ok, foreign account refused', async () => {
  const ok = await checkInvoiceReferences(fakeDb(), ME, invoiceReferences({ job_id: J_CREW, account_id: ACC_MINE }));
  assert.deepEqual(ok, { ok: true, invalid: [], failed: false });
  const bad = await checkInvoiceReferences(fakeDb(), ME, invoiceReferences({ job_id: J_FOREIGN, account_id: ACC_OTHER }));
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.invalid.sort(), ['account_id', 'job_id']);
});

test('checkInvoiceReferences: a failed lookup is failed, never a list of fields', async () => {
  const result = await checkInvoiceReferences(fakeDb({ fail: ['contractor_jobs'] }), ME, invoiceReferences({ job_id: J_OWN }));
  assert.deepEqual(result, { ok: false, invalid: [], failed: true });
});

test('filterPaycheckEmbeds keeps own job and contact, strips user_id', () => {
  const out = filterPaycheckEmbeds({
    id: 'p',
    contractor_jobs: { id: J_OWN, user_id: ME, job_number: 'J1', user_contacts: { user_id: ME, paycheck_portal_url: 'u' } },
    paycheck_deposits: [{ id: 'd', financial_accounts: { user_id: ME, name: 'Checking' } }],
  }, ME, new Set(), new Set());
  assert.deepEqual(out.contractor_jobs, { id: J_OWN, job_number: 'J1', user_contacts: { paycheck_portal_url: 'u' } });
  assert.deepEqual((out.paycheck_deposits as Row[])[0].financial_accounts, { name: 'Checking' });
});

test('filterPaycheckEmbeds: crew job visible without the owner contact; foreign hidden', () => {
  const crew = filterPaycheckEmbeds({
    contractor_jobs: { id: J_CREW, user_id: OTHER, job_number: 'J3', user_contacts: { user_id: OTHER, paycheck_portal_url: 'secret' } },
  }, ME, new Set([J_CREW]), new Set());
  assert.deepEqual(crew.contractor_jobs, { id: J_CREW, job_number: 'J3', user_contacts: null });

  const foreign = filterPaycheckEmbeds({
    contractor_jobs: { id: J_FOREIGN, user_id: OTHER, job_number: 'J5' },
    paycheck_deposits: [{ id: 'd', financial_accounts: { user_id: OTHER, name: 'Their savings' } }],
  }, ME, new Set([J_CREW]), new Set());
  assert.equal(foreign.contractor_jobs, null);
  assert.equal((foreign.paycheck_deposits as Row[])[0].financial_accounts, null);
});

test('visiblePaycheckEmbeds looks up job access for other users\' jobs, list and single', async () => {
  const list = await visiblePaycheckEmbeds(fakeDb(), ME, [
    { contractor_jobs: { id: J_CREW, user_id: OTHER, job_number: 'J3' } },
    { contractor_jobs: { id: J_FOREIGN, user_id: OTHER, job_number: 'J5' } },
  ]);
  assert.deepEqual(list.map((row) => row.contractor_jobs), [{ id: J_CREW, job_number: 'J3' }, null]);

  const single = await visiblePaycheckEmbeds(fakeDb({ fail: ['contractor_jobs'] }), ME, {
    contractor_jobs: { id: J_CREW, user_id: OTHER, job_number: 'J3' },
  });
  assert.equal(single.contractor_jobs, null, 'a failed lookup hides, never shows');
});
