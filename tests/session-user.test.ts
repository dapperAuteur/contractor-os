// File: tests/session-user.test.ts
// lib/auth/session-user-shape.ts: the { id, email } shape getSessionUser() returns (plan 18 Phase 2).
// Run with `npm run test:db`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSessionUser } from '../lib/auth/session-user-shape.ts';

test('a user with an id and email maps to { id, email }, email lower-cased', () => {
  assert.deepEqual(toSessionUser({ id: 'u-1', email: ' Person@Example.COM ' }), { id: 'u-1', email: 'person@example.com' });
});

test('a missing email becomes null; the person is still signed in', () => {
  assert.deepEqual(toSessionUser({ id: 'u-1' }), { id: 'u-1', email: null });
  assert.deepEqual(toSessionUser({ id: 'u-1', email: '' }), { id: 'u-1', email: null });
});

test('no user, or no usable id, means signed out', () => {
  assert.equal(toSessionUser(null), null);
  assert.equal(toSessionUser(undefined), null);
  assert.equal(toSessionUser({ email: 'a@b.c' }), null);
  assert.equal(toSessionUser({ id: '' }), null);
  assert.equal(toSessionUser({ id: 42 }), null);
});
