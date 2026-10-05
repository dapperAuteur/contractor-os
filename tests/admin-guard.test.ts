// File: tests/admin-guard.test.ts
// The admin API guard: lib/auth/admin-verdict.ts (the decision) and a scan proving every admin API
// route goes through lib/auth/require-admin.ts. Run with `npm run test:auth`.
//
// The rule: signed in, the ADMIN_EMAIL account, and the session at aal2 (second factor verified).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  adminVerdict,
  ADMIN_MFA_ENROL_MESSAGE,
  ADMIN_MFA_VERIFY_MESSAGE,
} from '../lib/auth/admin-verdict.ts';

const ADMIN = 'admin@example.com';
const base = {
  signedIn: true,
  email: ADMIN,
  adminEmail: ADMIN,
  currentLevel: 'aal2',
  hasVerifiedTotp: true,
};

test('admin with MFA verified (aal2) is allowed', () => {
  assert.deepEqual(adminVerdict(base), { ok: true });
});

test('admin enrolled in MFA but at aal1 (password only) gets 403 mfa_required', () => {
  const v = adminVerdict({ ...base, currentLevel: 'aal1' });
  assert.equal(v.ok, false);
  if (!v.ok) {
    assert.equal(v.status, 403);
    assert.equal(v.code, 'mfa_required');
    assert.equal(v.error, ADMIN_MFA_VERIFY_MESSAGE);
  }
});

test('admin with no factor enrolled gets 403 mfa_required and is told to turn it on', () => {
  const v = adminVerdict({ ...base, currentLevel: 'aal1', hasVerifiedTotp: false });
  assert.equal(v.ok, false);
  if (!v.ok) {
    assert.equal(v.status, 403);
    assert.equal(v.code, 'mfa_required');
    assert.equal(v.error, ADMIN_MFA_ENROL_MESSAGE);
  }
});

test('an unreadable assurance level fails closed', () => {
  for (const currentLevel of [null, undefined, '', 'AAL2']) {
    const v = adminVerdict({ ...base, currentLevel });
    assert.equal(v.ok, false, `level ${String(currentLevel)}`);
    if (!v.ok) assert.equal(v.code, 'mfa_required');
  }
});

test('non-admin gets 403 not_admin, even at aal2', () => {
  const v = adminVerdict({ ...base, email: 'someone@example.com' });
  assert.equal(v.ok, false);
  if (!v.ok) {
    assert.equal(v.status, 403);
    assert.equal(v.code, 'not_admin');
  }
});

test('non-admin is refused before MFA is considered', () => {
  const v = adminVerdict({ ...base, email: 'someone@example.com', currentLevel: 'aal1' });
  assert.equal(v.ok, false);
  if (!v.ok) assert.equal(v.code, 'not_admin');
});

test('ADMIN_EMAIL unset or blank means nobody is admin', () => {
  for (const adminEmail of [undefined, null, '', '   ']) {
    const v = adminVerdict({ ...base, adminEmail });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.code, 'not_admin');
  }
});

test('a user with no email is not the admin', () => {
  const v = adminVerdict({ ...base, email: null });
  assert.equal(v.ok, false);
  if (!v.ok) assert.equal(v.code, 'not_admin');
});

test('signed out gets 401', () => {
  const v = adminVerdict({ ...base, signedIn: false, email: undefined });
  assert.equal(v.ok, false);
  if (!v.ok) {
    assert.equal(v.status, 401);
    assert.equal(v.code, 'signed_out');
  }
});

// ---------------------------------------------------------------------------------------------
// Coverage scan: every admin API route uses the shared guard, and none keeps its own email check.

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...routeFiles(p));
    else if (name === 'route.ts') out.push(p);
  }
  return out;
}

// demo/setup is guarded by CRON_SECRET only (a curl-run setup script), by design.
const CRON_ONLY = new Set([join('app', 'api', 'admin', 'demo', 'setup', 'route.ts')]);

const DEMO_RESET = join('app', 'api', 'admin', 'demo', 'reset', 'route.ts');

// Admin-only routes that live outside app/api/admin.
const OTHER_ADMIN_ROUTES = [
  join('app', 'api', 'institutions', 'aggregate', 'route.ts'),
  join('app', 'api', 'blog', 'import', 'route.ts'),
];

const adminRoutes = [...routeFiles(join('app', 'api', 'admin')), ...OTHER_ADMIN_ROUTES].filter(
  (f) => !CRON_ONLY.has(f),
);

test('the scan finds the admin routes', () => {
  assert.ok(adminRoutes.length >= 60, `found ${adminRoutes.length}`);
});

for (const file of adminRoutes) {
  test(`${file} uses requireAdmin() and no local ADMIN_EMAIL check`, () => {
    const src = readFileSync(file, 'utf8');
    assert.match(src, /from '@\/lib\/auth\/require-admin'/);
    assert.match(src, /await requireAdmin\(\)/);
    assert.doesNotMatch(src, /process\.env\.ADMIN_EMAIL/);
    // Every exported handler calls the guard.
    const handlers = src.match(/export async function (GET|POST|PATCH|PUT|DELETE)\b/g) ?? [];
    const calls = src.match(/await requireAdmin\(\)/g) ?? [];
    assert.ok(handlers.length > 0, 'no handlers found');
    // demo/reset: GET is the Vercel cron (CRON_SECRET only); POST takes the secret or requireAdmin().
    if (file === DEMO_RESET) return;
    assert.ok(calls.length >= handlers.length, `${handlers.length} handlers, ${calls.length} guard calls`);
  });
}

test('demo/reset: GET is cron-only, POST falls back to requireAdmin()', () => {
  const src = readFileSync(DEMO_RESET, 'utf8');
  const get = src.slice(src.indexOf('export async function GET'), src.indexOf('export async function POST'));
  const post = src.slice(src.indexOf('export async function POST'));
  assert.match(get, /guard\(request\)/);
  assert.doesNotMatch(get, /requireAdmin/);
  assert.match(post, /if \(!guard\(request\)\) \{[\s\S]*?await requireAdmin\(\)[\s\S]*?if \(!auth\.ok\) return auth\.response;/);
});

test('demo/setup stays CRON_SECRET-only', () => {
  const src = readFileSync([...CRON_ONLY][0], 'utf8');
  assert.match(src, /CRON_SECRET/);
});
