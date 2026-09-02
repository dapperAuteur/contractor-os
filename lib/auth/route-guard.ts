// File: lib/auth/route-guard.ts
// The routing half of authentication, extracted from middleware.ts as a pure function.
//
// WHY IT IS SPLIT OUT. middleware.ts needs a live Supabase client, a request and a response, so its
// decisions were previously unprovable. Adding "Sign in with WitUS" made one of those decisions
// load-bearing enough to need a proof: BAM's rule for this app is that an ecosystem sign-in must
// NOT be a way to skip MFA, and the only honest way to show that is to test the verdict this
// function returns for a session that is authenticated but still at aal1. See
// tests/witus-sso.test.ts.
//
// middleware.ts keeps the I/O — reading the session, evaluating the assurance level — and calls
// this to decide where the request goes. The WitUS callback route shares the same destinations via
// `postWitusSignInPath`, so the two doors cannot drift apart.
//
// Deliberately IMPORT-FREE, like lib/sentry-scrub.ts: it is loaded by the edge middleware and by the
// node test runner, and a pure module with no dependencies works unchanged in both.

/** Where an unauthenticated visitor to a protected route is sent. */
export const LOGIN_PATH = '/login';

/**
 * Where a session that still owes a second factor is sent.
 *
 * `/login` reads `?mfa=pending` and renders `MfaVerifyStep` instead of the credential form
 * (app/login/page.tsx). That handling has existed since MFA shipped, but nothing ever produced the
 * parameter — the middleware had no assurance-level check at all — so the second factor was
 * enforced only by the login page's own client-side branch, and only for the tab that signed in.
 */
export const MFA_PENDING_PATH = '/login?mfa=pending';

/** Post-sign-in landing page. Matches `dashboardRedirect` in app/login/page.tsx. */
export const DASHBOARD_HOME = '/dashboard/contractor';

/** Where the middleware sends an already-authenticated visitor who lands on /login or /signup. */
export const DASHBOARD_ROOT = '/dashboard';

export type RouteVerdict = { action: 'allow' } | { action: 'redirect'; to: string };

const allow: RouteVerdict = { action: 'allow' };
const redirect = (to: string): RouteVerdict => ({ action: 'redirect', to });

/**
 * Where does this request go?
 *
 * Only ever called for the paths in middleware's matcher: `/admin/*`, `/dashboard/*`, `/login`,
 * `/signup`.
 *
 * ORDER MATTERS, and the MFA branch sitting above the admin and dashboard branches is the whole
 * point. A session that has authenticated but not yet reached aal2 reaches NO protected route,
 * whichever door it came through — password, email OTP, or the WitUS ecosystem callback. `/login`
 * is the single exception, because it is the page that clears the condition.
 */
export function authRouteVerdict(input: {
  pathname: string;
  signedIn: boolean;
  isAdmin: boolean;
  mfaPending: boolean;
}): RouteVerdict {
  const { pathname, signedIn, isAdmin, mfaPending } = input;

  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/dashboard');

  if (!signedIn) {
    return isProtected ? redirect(LOGIN_PATH) : allow;
  }

  // Authenticated but owing a second factor: nothing protected, no exceptions.
  if (mfaPending) {
    return pathname === LOGIN_PATH ? allow : redirect(MFA_PENDING_PATH);
  }

  // Admin-only surfaces. Blog is locked to the admin for now (it can be unlocked later).
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard/blog')) {
    return isAdmin ? allow : redirect(DASHBOARD_HOME);
  }

  if (pathname === LOGIN_PATH || pathname === '/signup') {
    return redirect(DASHBOARD_ROOT);
  }

  return allow;
}

/**
 * Where the WitUS OIDC callback sends a browser once it has minted a Supabase session.
 *
 * THE MFA BRANCH IS THE POINT (BAM's decision, 2026-09-02: an ecosystem sign-in must not be a way
 * to skip MFA). The password and email-OTP forms both stop at `MfaVerifyStep` when the account has
 * a verified TOTP factor; a WitUS sign-in lands the same account with the same aal1 session, so it
 * has to stop at the same gate. Sending it to the dashboard instead would make "Sign in with WitUS"
 * a documented second-factor bypass for every account in the app.
 *
 * `?sso=tried` rides along because this is a bounce back to /login: it is the half of the
 * "Continue as ..." loop guard that survives a browser with no usable sessionStorage, and without
 * it the login page would probe the IdP again and offer to restart the flow the visitor is in the
 * middle of finishing.
 */
export function postWitusSignInPath(mfaPending: boolean): string {
  return mfaPending ? MFA_PENDING_WITH_SSO_MARKER : DASHBOARD_HOME;
}

/**
 * `MFA_PENDING_PATH` with the SSO attempt marker appended.
 *
 * Spelled out rather than built with `withAttemptMarker()` so this module stays import-free (see the
 * header). tests/witus-sso.test.ts asserts the two agree, so the literal cannot drift.
 */
export const MFA_PENDING_WITH_SSO_MARKER = '/login?mfa=pending&sso=tried';
