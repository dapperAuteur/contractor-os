// File: tests/email-sender.test.ts
// The sender must come from EMAIL_FROM only. Unset means "skip the send", never a hardcoded
// fallback address (the old fallback was a CentenarianOS address). RESEND_FROM_EMAIL is no longer
// read. Run with `npm run test:email`.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getSenderEmail, resetSenderWarningForTests } from '../lib/email/sender.ts';

beforeEach(() => resetSenderWarningForTests());

test('returns EMAIL_FROM when it is set', () => {
  const logs: string[] = [];
  const env = { EMAIL_FROM: 'Work.WitUS <notify@example.test>' };
  assert.equal(getSenderEmail(env, (m) => logs.push(m)), 'Work.WitUS <notify@example.test>');
  assert.equal(logs.length, 0);
});

test('trims surrounding whitespace', () => {
  assert.equal(getSenderEmail({ EMAIL_FROM: '  a@example.test \n' }, () => {}), 'a@example.test');
});

test('returns null and logs exactly once when unset', () => {
  const logs: string[] = [];
  const log = (m: string) => logs.push(m);
  assert.equal(getSenderEmail({}, log), null);
  assert.equal(getSenderEmail({}, log), null);
  assert.equal(getSenderEmail({ EMAIL_FROM: '' }, log), null);
  assert.equal(getSenderEmail({ EMAIL_FROM: '   ' }, log), null);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /EMAIL_FROM/);
});

test('ignores the retired RESEND_FROM_EMAIL', () => {
  assert.equal(getSenderEmail({ RESEND_FROM_EMAIL: 'old@example.test' }, () => {}), null);
});

test('never falls back to a CentenarianOS address', () => {
  const result = getSenderEmail({}, () => {});
  assert.equal(result, null);
  assert.doesNotMatch(String(result), /centenarian/i);
});
