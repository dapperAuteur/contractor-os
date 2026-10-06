// File: tests/email-sender.test.ts
// The Resend sender must come from RESEND_FROM_EMAIL only. Unset means "skip the send", never a
// hardcoded fallback address (the old fallback was a CentenarianOS address).
// Run with `npm run test:email`.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getSenderEmail, resetSenderWarningForTests } from '../lib/email/sender.ts';

beforeEach(() => resetSenderWarningForTests());

test('returns RESEND_FROM_EMAIL when it is set', () => {
  const logs: string[] = [];
  const env = { RESEND_FROM_EMAIL: 'Work.WitUS <notify@example.test>' };
  assert.equal(getSenderEmail(env, (m) => logs.push(m)), 'Work.WitUS <notify@example.test>');
  assert.equal(logs.length, 0);
});

test('trims surrounding whitespace', () => {
  assert.equal(getSenderEmail({ RESEND_FROM_EMAIL: '  a@example.test \n' }, () => {}), 'a@example.test');
});

test('returns null and logs exactly once when unset', () => {
  const logs: string[] = [];
  const log = (m: string) => logs.push(m);
  assert.equal(getSenderEmail({}, log), null);
  assert.equal(getSenderEmail({}, log), null);
  assert.equal(getSenderEmail({ RESEND_FROM_EMAIL: '' }, log), null);
  assert.equal(getSenderEmail({ RESEND_FROM_EMAIL: '   ' }, log), null);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /RESEND_FROM_EMAIL/);
});

test('never falls back to a CentenarianOS address', () => {
  const result = getSenderEmail({}, () => {});
  assert.equal(result, null);
  assert.doesNotMatch(String(result), /centenarian/i);
});
