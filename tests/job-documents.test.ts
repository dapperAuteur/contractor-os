// tests/job-documents.test.ts
// Run: npm run test:auth
//
// Who may see a job document (lib/contractor/job-documents.ts, plan 14.5),
// and the RLS migration that enforces the same rule in the database.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canSeeJobDocument,
  cleanDocumentUrl,
  jobDocumentsOrFilter,
  visibleJobDocuments,
} from '../lib/contractor/job-documents.ts';

const OWNER = '11111111-1111-4111-8111-111111111111';
const LISTER = '22222222-2222-4222-8222-222222222222';
const CREW = '33333333-3333-4333-8333-333333333333';
const UPLOADER = '44444444-4444-4444-8444-444444444444'; // a crew member who uploads
const STRANGER = '55555555-5555-4555-8555-555555555555';

const privateDoc = { id: 'p', user_id: UPLOADER, is_shared: false };
const sharedDoc = { id: 's', user_id: UPLOADER, is_shared: true };

// Who is on the job (what getJobWithRole would return non-null for).
const members = new Set([OWNER, LISTER, CREW, UPLOADER]);

const matrix: Array<[string, string, boolean, boolean]> = [
  // viewer, label, sees private, sees shared
  [OWNER, 'owner', false, true],
  [LISTER, 'lister', false, true],
  [CREW, 'crew', false, true],
  [UPLOADER, 'uploader', true, true],
  [STRANGER, 'unrelated user', false, false],
];

for (const [viewer, label, seesPrivate, seesShared] of matrix) {
  test(`visibility matrix: ${label}`, () => {
    const member = members.has(viewer);
    assert.equal(canSeeJobDocument(privateDoc, viewer, member), seesPrivate, 'private');
    assert.equal(canSeeJobDocument(sharedDoc, viewer, member), seesShared, 'shared');
    const ids = visibleJobDocuments([privateDoc, sharedDoc], viewer, member).map((d) => d.id);
    const expected: string[] = [];
    if (seesPrivate) expected.push('p');
    if (seesShared) expected.push('s');
    assert.deepEqual(ids, expected);
  });
}

test('owner and lister see their own private uploads, not each other\'s', () => {
  const ownerPrivate = { id: 'o', user_id: OWNER, is_shared: false };
  assert.equal(canSeeJobDocument(ownerPrivate, OWNER, true), true);
  assert.equal(canSeeJobDocument(ownerPrivate, LISTER, true), false);
  assert.equal(canSeeJobDocument(ownerPrivate, CREW, true), false);
});

test('a non-member sees nothing through the API, even an upload from a job they left', () => {
  assert.equal(canSeeJobDocument(privateDoc, UPLOADER, false), false);
  assert.equal(canSeeJobDocument(sharedDoc, UPLOADER, false), false);
  assert.deepEqual(visibleJobDocuments([privateDoc, sharedDoc], STRANGER, false), []);
});

test('missing documents, missing caller and odd values are refused', () => {
  assert.equal(canSeeJobDocument(null, OWNER, true), false);
  assert.equal(canSeeJobDocument(undefined, OWNER, true), false);
  assert.equal(canSeeJobDocument(sharedDoc, '', true), false);
  assert.equal(canSeeJobDocument({ user_id: null, is_shared: null }, OWNER, true), false);
  assert.deepEqual(visibleJobDocuments(null, OWNER, true), []);
});

test('the PostgREST filter is own-or-shared and only for a UUID caller', () => {
  assert.equal(jobDocumentsOrFilter(OWNER), `user_id.eq.${OWNER},is_shared.eq.true`);
  assert.equal(jobDocumentsOrFilter(''), null);
  assert.equal(jobDocumentsOrFilter(`${OWNER},is_shared.eq.false`), null);
  assert.equal(jobDocumentsOrFilter('not-a-uuid'), null);
});

test('document links must be http(s)', () => {
  assert.equal(cleanDocumentUrl(undefined), null);
  assert.equal(cleanDocumentUrl(''), null);
  assert.equal(cleanDocumentUrl('  https://res.cloudinary.com/x/a.pdf '), 'https://res.cloudinary.com/x/a.pdf');
  assert.equal(cleanDocumentUrl('http://example.com/a'), 'http://example.com/a');
  assert.equal(cleanDocumentUrl('javascript:alert(1)'), false);
  assert.equal(cleanDocumentUrl('data:text/html,hi'), false);
  assert.equal(cleanDocumentUrl('/relative'), false);
  assert.equal(cleanDocumentUrl(42), false);
});

// ── The 404 rule in the route ─────────────────────────────────────────
const route = readFileSync(
  new URL('../app/api/contractor/jobs/[id]/documents/route.ts', import.meta.url),
  'utf8',
);

test('route: not on the job and no such job answer the same 404', () => {
  assert.doesNotMatch(route, /Job not found/);
  const notFound = route.match(
    /if \(!result\) return NextResponse\.json\(\{ error: 'Not found' \}, \{ status: 404 \}\);/g,
  ) ?? [];
  assert.equal(notFound.length, 3, 'GET, POST and DELETE each check membership with the same 404');
});

test('route: the own-or-shared filter applies to every role', () => {
  assert.doesNotMatch(route, /role === 'worker'/);
  assert.match(route, /\.or\(filter\)/);
  assert.match(route, /visibleJobDocuments\(data, user\.id, true\)/);
});

// ── The migration ──────────────────────────────────────────────────────
const sql = readFileSync(
  new URL('../supabase/migrations/197_job_documents_member_read.sql', import.meta.url),
  'utf8',
);
// Ignore comments (including the rollback block) when checking what runs.
const body = sql
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');

test('migration drops the old broad policies', () => {
  assert.match(body, /DROP POLICY job_documents_shared_read ON public\.job_documents/);
  assert.match(body, /DROP POLICY job_documents_owner ON public\.job_documents/);
  assert.doesNotMatch(body, /CREATE POLICY job_documents_shared_read/);
  assert.doesNotMatch(body, /CREATE POLICY job_documents_owner\b/);
});

test('migration: shared read requires job membership', () => {
  assert.match(
    body,
    /CREATE POLICY job_documents_member_shared_read ON public\.job_documents\s+FOR SELECT TO authenticated\s+USING \(is_shared = true AND public\.is_contractor_job_member\(job_id\)\)/,
  );
});

test('migration: writes require the uploader to be on the job', () => {
  assert.match(
    body,
    /job_documents_uploader_insert[\s\S]*?WITH CHECK \(user_id = auth\.uid\(\) AND public\.is_contractor_job_member\(job_id\)\)/,
  );
  assert.match(
    body,
    /job_documents_uploader_update[\s\S]*?WITH CHECK \(user_id = auth\.uid\(\) AND public\.is_contractor_job_member\(job_id\)\)/,
  );
});

test('migration: membership helper covers owner, lister and accepted crew', () => {
  assert.match(body, /CREATE OR REPLACE FUNCTION public\.is_contractor_job_member\(p_job_id uuid\)/);
  assert.match(body, /SECURITY DEFINER/);
  assert.match(body, /SET search_path = public, pg_temp/);
  assert.match(body, /j\.user_id = auth\.uid\(\) OR j\.lister_id = auth\.uid\(\)/);
  assert.match(body, /a\.assigned_to = auth\.uid\(\)\s+AND a\.status = 'accepted'/);
  assert.match(body, /REVOKE ALL ON FUNCTION public\.is_contractor_job_member\(uuid\) FROM anon/);
});

test('migration is idempotent and carries a rollback note', () => {
  for (const m of body.matchAll(/CREATE POLICY (\w+)/g)) {
    assert.match(
      body,
      new RegExp(`IF NOT EXISTS[\\s\\S]{0,250}policyname = '${m[1]}'`),
      `${m[1]} is guarded`,
    );
  }
  assert.match(sql, /-- ROLLBACK/);
  assert.match(body, /NOTIFY pgrst, 'reload schema'/);
});
