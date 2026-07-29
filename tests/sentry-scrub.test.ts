// File: tests/sentry-scrub.test.ts
// The test that matters most for error monitoring: proves a crash report leaving Work.WitUS
// carries no credential and no personal data. Run with `npm run test:scrub`.
//
// Uses the Node built-in test runner with type stripping, so it adds no test-framework dependency
// to an app that has none.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ErrorEvent } from '@sentry/nextjs';
import { scrubEvent, redactSecrets, redactUrl, REDACTED_URL } from '../lib/sentry-scrub.ts';

/** Literals that must never survive a scrub, whatever shape the event takes. */
const SECRETS = [
  'sb-access-token=abc123',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSJ9.9v8ZQ0mVXcYcJ0hLwGJ0Kk3lQ7v6c1sQ',
  'crew.member@example.com',
  'hunter2secret',
  'zX9mQ2vB7nK4pL8wR1tY6uE3',
];

const JWT = SECRETS[1];

test('redactUrl drops the query string and masks generated path segments', () => {
  assert.equal(
    redactUrl('https://work.witus.online/dashboard/contractor/jobs/8b1f6c1e-4a2d-4f31-9d55-2c7a0e6b4f10'),
    'https://work.witus.online/dashboard/contractor/jobs/<id>',
  );
  assert.equal(
    redactUrl('https://abcdefg.supabase.co/rest/v1/contacts?select=*&email=eq.crew.member%40example.com'),
    'https://abcdefg.supabase.co/rest/v1/contacts?<redacted>',
  );
});

test('redactUrl drops credential and document URLs whole', () => {
  assert.equal(redactUrl('https://work.witus.online/auth/callback?code=zX9mQ2vB7nK4pL8wR1tY6uE3'), REDACTED_URL);
  assert.equal(redactUrl('https://work.witus.online/api/auth/demo-login'), REDACTED_URL);
  assert.equal(redactUrl('https://work.witus.online/reset-password?token_hash=zX9mQ2vB7nK4pL8wR1tY6uE3'), REDACTED_URL);
  assert.equal(redactUrl('https://res.cloudinary.com/witus/image/upload/v1/union-card-scan.jpg'), REDACTED_URL);
  assert.equal(
    redactUrl('https://abcdefg.supabase.co/storage/v1/object/sign/union-docs/local-77-contract.pdf'),
    REDACTED_URL,
  );
  assert.equal(redactUrl('not a url at all'), REDACTED_URL);
});

test('redactSecrets removes JWTs, emails and labelled secrets from prose', () => {
  const out = redactSecrets(
    `Invite to crew.member@example.com failed. password: hunter2secret, service_role key = ${JWT}`,
  );
  for (const secret of ['crew.member@example.com', 'hunter2secret', JWT]) {
    assert.ok(!out.includes(secret), `leaked: ${secret}`);
  }
  // The signal survives: we still know which flow broke.
  assert.ok(out.includes('Invite to'));
  assert.ok(out.includes('failed'));
});

test('ordinary prose is left alone', () => {
  const text = 'Failed to load job 12 for the union hub. Pin the invoice to the job when it lands.';
  assert.equal(redactSecrets(text), text);
});

test('scrubEvent strips identity, cookies, headers, query string and the request body', () => {
  const event = {
    message: `Union document fetch failed for crew.member@example.com`,
    user: { id: 'user-1', email: 'crew.member@example.com', ip_address: '203.0.113.7', username: 'bam' },
    request: {
      url: 'https://work.witus.online/api/contractor/union/documents/8b1f6c1e-4a2d-4f31-9d55-2c7a0e6b4f10?membership=local-77',
      query_string: 'membership=local-77&token=zX9mQ2vB7nK4pL8wR1tY6uE3',
      cookies: { 'sb-access-token': 'abc123' },
      data: { email: 'crew.member@example.com', notes: 'Local 77 dues in arrears', rate: 42 },
      headers: {
        cookie: 'sb-access-token=abc123',
        authorization: `Bearer ${JWT}`,
        apikey: JWT,
        'x-forwarded-for': '203.0.113.7',
        'x-vercel-ip-city': 'Baltimore',
        referer: 'https://work.witus.online/auth/callback?code=zX9mQ2vB7nK4pL8wR1tY6uE3',
        'user-agent': 'Mozilla/5.0',
      },
    },
    breadcrumbs: [
      {
        message: 'fetch https://res.cloudinary.com/witus/image/upload/v1/union-card-scan.jpg',
        data: { url: 'https://work.witus.online/api/contractor/invite?email=crew.member@example.com', status_code: 500 },
      },
    ],
    extra: { lastDocument: 'https://res.cloudinary.com/witus/image/upload/v1/union-card-scan.jpg' },
  } as unknown as ErrorEvent;

  const scrubbed = scrubEvent(event);
  assert.ok(scrubbed, 'scrubEvent must never drop the crash signal');

  // Identity: the opaque id survives, nothing else does.
  assert.deepEqual(scrubbed.user, { id: 'user-1' });

  // Request: body, cookies and query string are gone entirely.
  assert.equal(scrubbed.request?.data, undefined);
  assert.equal(scrubbed.request?.cookies, undefined);
  assert.equal(scrubbed.request?.query_string, undefined);

  const headers = scrubbed.request?.headers as Record<string, string>;
  for (const dropped of ['cookie', 'authorization', 'apikey', 'x-forwarded-for', 'x-vercel-ip-city']) {
    assert.equal(headers[dropped], undefined, `header not dropped: ${dropped}`);
  }
  assert.equal(headers['user-agent'], 'Mozilla/5.0', 'harmless headers should survive');
  assert.equal(headers.referer, REDACTED_URL);

  // The route is still identifiable, the record id is not.
  assert.equal(scrubbed.request?.url, 'https://work.witus.online/api/contractor/union/documents/<id>?<redacted>');

  // Nothing sensitive anywhere in the serialized payload.
  const serialized = JSON.stringify(scrubbed);
  for (const secret of SECRETS) {
    assert.ok(!serialized.includes(secret), `leaked in payload: ${secret}`);
  }
  assert.ok(!serialized.includes('union-card-scan'), 'leaked an uploaded document URL');
  assert.ok(!serialized.includes('dues in arrears'), 'leaked a request body');
  assert.ok(!serialized.includes('203.0.113.7'), 'leaked the requester IP');
});

test('scrubEvent handles an event with nothing attached', () => {
  const event = { exception: { values: [{ type: 'Error', value: `token=${JWT}` }] } } as unknown as ErrorEvent;
  const scrubbed = scrubEvent(event);
  assert.ok(!JSON.stringify(scrubbed).includes(JWT));
});
