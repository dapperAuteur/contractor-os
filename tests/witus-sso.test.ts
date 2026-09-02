// File: tests/witus-sso.test.ts
// Ecosystem SSO ("Sign in with WitUS" / "Continue as <name>" / global sign-out) and the MFA gate
// that sits behind it. Run with `npm run test:sso`.
//
// THE TEST THAT MATTERS MOST HERE is the last group: an account with a verified TOTP factor that
// signs in through WitUS must NOT reach a protected route at aal1. This app enforces MFA on its
// password and email-OTP doors; BAM's decision (2026-09-02) is that the ecosystem door does not get
// to be the exception. The two functions exercised below are the only two places that decide it —
// `postWitusSignInPath` (where the OIDC callback sends the browser) and `authRouteVerdict` (what
// middleware.ts does with every subsequent request) — so pinning both pins the property.
//
// Uses the Node built-in test runner with type stripping, so it adds no test-framework dependency
// to an app that has none.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SSO_ATTEMPT_STORAGE_KEY,
  continueAsLabel,
  endSessionEndpointFromAuthorizeUrl,
  hasAttemptMarker,
  onRegisteredOrigin,
  parseSilentSsoIdentity,
  signOutLabel,
  silentSsoDecision,
  silentSsoEndpointFromAuthorizeUrl,
  withAttemptMarker,
  witusLogoutUrl,
  WITUS_CALLBACK_PATH,
  WITUS_OIDC_AUTHORIZE_FALLBACK,
} from '../lib/auth/witus-sso.ts';
import {
  authRouteVerdict,
  postWitusSignInPath,
  DASHBOARD_HOME,
  LOGIN_PATH,
  MFA_PENDING_PATH,
  MFA_PENDING_WITH_SSO_MARKER,
} from '../lib/auth/route-guard.ts';
import { mfaVerificationPending, needsMfaVerification } from '../lib/mfa/helpers.ts';

const APP_ORIGIN = 'https://work.witus.online';
const OTHER_HOST = 'https://www.badcba.com';
const PROBE = 'https://accounts.witus.online/api/ecosystem/session';
const END_SESSION = 'https://accounts.witus.online/api/idp/oauth2/endsession?client_id=witus-work';

// ─────────────────────────────────────────────────────────────────────────────
// Endpoint derivation — accounts.witus.online is asserted in exactly one place.
// ─────────────────────────────────────────────────────────────────────────────

test('probe and endsession endpoints derive from the configured authorize URL', () => {
  assert.equal(silentSsoEndpointFromAuthorizeUrl(WITUS_OIDC_AUTHORIZE_FALLBACK), PROBE);
  assert.equal(
    endSessionEndpointFromAuthorizeUrl(WITUS_OIDC_AUTHORIZE_FALLBACK),
    'https://accounts.witus.online/api/idp/oauth2/endsession',
  );
  // A self-hosted or staging IdP moves both endpoints with it — nothing is hardcoded downstream.
  assert.equal(
    silentSsoEndpointFromAuthorizeUrl('https://idp.example.test/auth/oauth2/authorize'),
    'https://idp.example.test/api/ecosystem/session',
  );
  assert.equal(
    endSessionEndpointFromAuthorizeUrl('https://idp.example.test/auth/oauth2/authorize'),
    'https://idp.example.test/auth/oauth2/endsession',
  );
  for (const bad of [null, undefined, '', 'not a url', 'https://idp.example.test/whatever']) {
    assert.equal(silentSsoEndpointFromAuthorizeUrl(bad), null, `probe from ${bad}`);
    assert.equal(endSessionEndpointFromAuthorizeUrl(bad), null, `endsession from ${bad}`);
  }
});

test('the redirect_uri path is the Supabase bespoke-flow one, not better-auth default', () => {
  // The IdP exact-matches redirect_uri. If this constant ever drifts from the `work` entry in
  // gemini/witus lib/identity/clients.ts, sign-in 400s.
  assert.equal(WITUS_CALLBACK_PATH, '/api/auth/witus/callback');
});

// ─────────────────────────────────────────────────────────────────────────────
// Host gate — this one deployment serves two hosts, only one of which the IdP knows.
// ─────────────────────────────────────────────────────────────────────────────

test('the registered-origin check accepts only the registered host', () => {
  assert.equal(onRegisteredOrigin(APP_ORIGIN, APP_ORIGIN), true);
  assert.equal(onRegisteredOrigin(`${APP_ORIGIN}/`, 'https://WORK.witus.online'), true);
  assert.equal(onRegisteredOrigin(APP_ORIGIN, OTHER_HOST), false);
  // Cannot-tell is a NO on both sides.
  assert.equal(onRegisteredOrigin(null, APP_ORIGIN), false);
  assert.equal(onRegisteredOrigin(APP_ORIGIN, null), false);
});

test('the silent probe never fires from the unregistered host or when dark', () => {
  const base = { endpoint: PROBE, appOrigin: APP_ORIGIN, currentOrigin: APP_ORIGIN };

  assert.deepEqual(silentSsoDecision(base), { attempt: true });
  assert.deepEqual(silentSsoDecision({ ...base, endpoint: null }), {
    attempt: false,
    skip: 'not-configured',
  });
  // www.badcba.com must not make even one request to accounts.witus.online.
  assert.deepEqual(silentSsoDecision({ ...base, currentOrigin: OTHER_HOST }), {
    attempt: false,
    skip: 'wrong-host',
  });
  assert.deepEqual(silentSsoDecision({ ...base, signedIn: true }), {
    attempt: false,
    skip: 'already-signed-in',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Loop guard — one attempt per tab, by either half.
// ─────────────────────────────────────────────────────────────────────────────

test('either half of the loop guard stops a second probe', () => {
  const base = { endpoint: PROBE, appOrigin: APP_ORIGIN, currentOrigin: APP_ORIGIN };

  // Half 1: the sessionStorage marker, written immediately before the redirect.
  assert.deepEqual(silentSsoDecision({ ...base, attempted: true }), {
    attempt: false,
    skip: 'already-attempted',
  });
  // Half 2: the query param, which survives a browser with no usable sessionStorage.
  assert.deepEqual(silentSsoDecision({ ...base, search: '?sso=tried&error=witus_token' }), {
    attempt: false,
    skip: 'already-attempted',
  });
  assert.equal(SSO_ATTEMPT_STORAGE_KEY, 'witus.sso.attempted');
});

test('the attempt marker is read and written without losing existing query', () => {
  assert.equal(hasAttemptMarker('?sso=tried'), true);
  assert.equal(hasAttemptMarker('sso=tried'), true);
  assert.equal(hasAttemptMarker('?sso=nope'), false);
  assert.equal(hasAttemptMarker(''), false);
  assert.equal(hasAttemptMarker(null), false);

  assert.equal(withAttemptMarker('/login'), '/login?sso=tried');
  assert.equal(
    withAttemptMarker('/login?error=witus_token'),
    '/login?error=witus_token&sso=tried',
  );
  // The MFA bounce keeps its parameter — losing it would drop the visitor on the plain form.
  assert.equal(withAttemptMarker(MFA_PENDING_PATH), '/login?mfa=pending&sso=tried');
  // route-guard.ts spells this literal out to stay import-free; this is the anti-drift assertion
  // its comment promises.
  assert.equal(MFA_PENDING_WITH_SSO_MARKER, withAttemptMarker(MFA_PENDING_PATH));
  assert.equal(withAttemptMarker('/login?sso=tried'), '/login?sso=tried');
});

// ─────────────────────────────────────────────────────────────────────────────
// The probe answer is display copy, never a credential.
// ─────────────────────────────────────────────────────────────────────────────

test('a probe identity is sanitised, capped, and optional', () => {
  assert.deepEqual(parseSilentSsoIdentity({ signedIn: true, user: { name: 'Ada Lovelace' } }), {
    label: 'Ada Lovelace',
  });
  assert.equal(parseSilentSsoIdentity({ signedIn: false }), null);
  assert.equal(parseSilentSsoIdentity(null), null);
  assert.equal(parseSilentSsoIdentity('nope'), null);
  assert.equal(parseSilentSsoIdentity({ signedIn: true, user: {} }), null);
  // Falls back to the email when there is no name.
  assert.deepEqual(parseSilentSsoIdentity({ signedIn: true, user: { email: 'a@b.test' } }), {
    label: 'a@b.test',
  });

  // Control characters cannot get into the DOM, and length is capped at 48.
  const hostile = parseSilentSsoIdentity({ user: { name: '  Ada \nLovelace  ' } });
  assert.deepEqual(hostile, { label: 'AdaLovelace' });
  const long = parseSilentSsoIdentity({ user: { name: 'x'.repeat(200) } });
  assert.ok(long);
  assert.equal(long.label.length, 48);
  assert.ok(long.label.endsWith('…'));
});

test('button copy switches only when an identity was found', () => {
  assert.equal(continueAsLabel(null), 'Sign in with WitUS');
  assert.equal(continueAsLabel({ label: 'Ada' }), 'Continue as Ada');
  assert.equal(signOutLabel(null), 'Logout');
  assert.equal(signOutLabel(END_SESSION), 'Sign out of WitUS');
});

// ─────────────────────────────────────────────────────────────────────────────
// Global sign-out.
// ─────────────────────────────────────────────────────────────────────────────

test('the logout URL carries client_id and an exactly-registered post-logout target', () => {
  const url = new URL(witusLogoutUrl(END_SESSION, APP_ORIGIN));
  assert.equal(url.origin + url.pathname, 'https://accounts.witus.online/api/idp/oauth2/endsession');
  // client_id is REQUIRED: better-auth rejects post_logout_redirect_uri with invalid_request
  // without it (we have no id_token client-side).
  assert.equal(url.searchParams.get('client_id'), 'witus-work');
  // EXACTLY the registered value, trailing slash included. Drop the slash and the IdP 400s.
  assert.equal(url.searchParams.get('post_logout_redirect_uri'), 'https://work.witus.online/');
  // A configured origin with a stray trailing slash must not produce a double slash.
  assert.equal(
    new URL(witusLogoutUrl(END_SESSION, `${APP_ORIGIN}/`)).searchParams.get(
      'post_logout_redirect_uri',
    ),
    'https://work.witus.online/',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MFA — an ecosystem sign-in is not a way to skip the second factor.
// ─────────────────────────────────────────────────────────────────────────────

test('mfaVerificationPending trusts the server-validated factor list over nextLevel', () => {
  // A session already at aal2 owes nothing.
  assert.equal(
    mfaVerificationPending({ hasVerifiedTotp: true, currentLevel: 'aal2', nextLevel: 'aal2' }),
    false,
  );
  // The ordinary enrolled-and-not-yet-verified case.
  assert.equal(
    mfaVerificationPending({ hasVerifiedTotp: true, currentLevel: 'aal1', nextLevel: 'aal2' }),
    true,
  );
  // THE ATTACK THIS GUARDS. `nextLevel` is derived from the auth cookie's unsigned user object, so a
  // client can strip `factors` and present "aal1 -> aal1". `needsMfaVerification` believes it;
  // `mfaVerificationPending` does not, because `hasVerifiedTotp` comes from getUser().
  assert.equal(needsMfaVerification('aal1', 'aal1'), false);
  assert.equal(
    mfaVerificationPending({ hasVerifiedTotp: true, currentLevel: 'aal1', nextLevel: 'aal1' }),
    true,
  );
  // An account with no factor is never held up.
  assert.equal(
    mfaVerificationPending({ hasVerifiedTotp: false, currentLevel: 'aal1', nextLevel: 'aal1' }),
    false,
  );
});

test('a WitUS sign-in with NO enrolled factor lands on the dashboard, as it always did', () => {
  assert.equal(postWitusSignInPath(false), DASHBOARD_HOME);
  assert.equal(
    authRouteVerdict({
      pathname: DASHBOARD_HOME,
      signedIn: true,
      isAdmin: false,
      mfaPending: false,
    }).action,
    'allow',
  );
});

test('a WitUS sign-in by a user WITH enrolled factors cannot reach a protected route at aal1', () => {
  // 1. The account: enrolled TOTP, and the session the OIDC callback just minted is aal1 — exactly
  //    what admin.generateLink + verifyOtp produces, and exactly what signInWithPassword produces.
  const mfaPending = mfaVerificationPending({
    hasVerifiedTotp: true,
    currentLevel: 'aal1',
    nextLevel: 'aal2',
  });
  assert.equal(mfaPending, true);

  // 2. The callback sends them to the MFA gate, not to the dashboard — and carries ?sso=tried so
  //    the login page does not re-probe and offer to restart the flow they are finishing.
  assert.equal(postWitusSignInPath(mfaPending), '/login?mfa=pending&sso=tried');

  // 3. Typing a protected URL instead does not help: middleware returns the same verdict for every
  //    protected surface, including the admin ones, and including an admin account.
  for (const pathname of [
    '/dashboard',
    '/dashboard/contractor',
    '/dashboard/contractor/jobs',
    '/dashboard/blog',
    '/admin',
    '/admin/union-submissions',
    '/signup',
  ]) {
    for (const isAdmin of [false, true]) {
      assert.deepEqual(
        authRouteVerdict({ pathname, signedIn: true, isAdmin, mfaPending }),
        { action: 'redirect', to: MFA_PENDING_PATH },
        `${pathname} (isAdmin=${isAdmin}) must not be reachable at aal1`,
      );
    }
  }

  // 4. /login is the ONE place they are allowed, because it is the page that clears the condition.
  //    Without this the redirect above would bounce forever.
  assert.deepEqual(
    authRouteVerdict({ pathname: LOGIN_PATH, signedIn: true, isAdmin: false, mfaPending }),
    { action: 'allow' },
  );

  // 5. Once the second factor is verified the session is aal2, nothing is pending, and the dashboard
  //    opens.
  const afterVerify = mfaVerificationPending({
    hasVerifiedTotp: true,
    currentLevel: 'aal2',
    nextLevel: 'aal2',
  });
  assert.equal(afterVerify, false);
  assert.deepEqual(
    authRouteVerdict({
      pathname: DASHBOARD_HOME,
      signedIn: true,
      isAdmin: false,
      mfaPending: afterVerify,
    }),
    { action: 'allow' },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// The pre-existing guards the MFA branch had to be threaded through, unchanged.
// ─────────────────────────────────────────────────────────────────────────────

test('the existing auth routing is preserved', () => {
  const signedOut = { signedIn: false, isAdmin: false, mfaPending: false };
  assert.deepEqual(authRouteVerdict({ pathname: '/dashboard/contractor', ...signedOut }), {
    action: 'redirect',
    to: LOGIN_PATH,
  });
  assert.deepEqual(authRouteVerdict({ pathname: '/admin', ...signedOut }), {
    action: 'redirect',
    to: LOGIN_PATH,
  });
  assert.deepEqual(authRouteVerdict({ pathname: LOGIN_PATH, ...signedOut }), { action: 'allow' });
  assert.deepEqual(authRouteVerdict({ pathname: '/signup', ...signedOut }), { action: 'allow' });

  const member = { signedIn: true, isAdmin: false, mfaPending: false };
  assert.deepEqual(authRouteVerdict({ pathname: '/admin', ...member }), {
    action: 'redirect',
    to: DASHBOARD_HOME,
  });
  assert.deepEqual(authRouteVerdict({ pathname: '/dashboard/blog', ...member }), {
    action: 'redirect',
    to: DASHBOARD_HOME,
  });
  assert.deepEqual(authRouteVerdict({ pathname: LOGIN_PATH, ...member }), {
    action: 'redirect',
    to: '/dashboard',
  });

  const admin = { signedIn: true, isAdmin: true, mfaPending: false };
  assert.deepEqual(authRouteVerdict({ pathname: '/admin', ...admin }), { action: 'allow' });
  assert.deepEqual(authRouteVerdict({ pathname: '/dashboard/blog', ...admin }), {
    action: 'allow',
  });
});
