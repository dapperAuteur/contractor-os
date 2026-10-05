// tests/job-fields.test.ts
// Run: npm run test:auth
//
// The foreign ids a contractor job or event carries (lib/contractor/job-fields.ts)
// and the contractor tables added to the shared ownership rules.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOB_REFERENCE_FIELDS, changedReferences, jobReferences } from '../lib/contractor/job-fields.ts';
import { canAccessRow, getTableRule } from '../lib/auth/ownership.ts';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

test('every job reference points at a table with an ownership rule', () => {
  for (const { field, table } of JOB_REFERENCE_FIELDS) {
    assert.ok(getTableRule(table), `${field} → ${table} has no rule`);
  }
});

test('jobReferences picks up only the fields the body has', () => {
  const refs = jobReferences({ client_id: 'c', location_id: 'l', client_name: 'Acme', pay_rate: 40 });
  assert.deepEqual(refs.map((r) => [r.field, r.table]), [
    ['client_id', 'user_contacts'],
    ['location_id', 'contact_locations'],
  ]);
});

test('changedReferences skips ids the job already has', () => {
  const existing = { client_id: 'c-owner', location_id: 'l-owner', event_id: null };
  const refs = changedReferences({ client_id: 'c-owner', location_id: 'l-new', event_id: null, brand_id: 'b' }, existing);
  assert.deepEqual(refs.map((r) => r.field), ['location_id', 'brand_id']);
});

test('changedReferences with no saved row checks everything given', () => {
  assert.equal(changedReferences({ client_id: 'x', poc_contact_id: 'y' }, null).length, 2);
});

test('contractor_events and paychecks are owner-only', () => {
  for (const table of ['contractor_events', 'paychecks']) {
    assert.equal(canAccessRow(table, { user_id: ME }, ME), true);
    assert.equal(canAccessRow(table, { user_id: OTHER }, ME), false);
    assert.equal(canAccessRow(table, { user_id: OTHER }, ME, { allowPublic: true }), false);
  }
});
