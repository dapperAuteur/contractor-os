// File: app/api/auth/witus/callback/route.ts
// Completes the "Sign in with WitUS" OIDC flow:
//   1. verify state, exchange the code (+ PKCE verifier) for tokens,
//   2. read the user's claims from the IdP userinfo endpoint (server-to-server, so there is no
//      client-side JWT to verify and no jose dependency),
//   3. find-or-create the Supabase user by email (service role),
//   4. mint a Supabase session for them, and link witus_sub -> user_id,
//   5. SEND THEM THROUGH THE SAME MFA GATE A PASSWORD LOGIN HITS.
//
// STEP 5 IS NOT OPTIONAL (BAM's decision, 2026-09-02). This app has TOTP MFA that its reference
// implementation does not, and both existing doors — password and email OTP — stop at
// `MfaVerifyStep` before the dashboard. The session minted below is an ordinary aal1 Supabase
// session, exactly like the one `signInWithPassword` produces, so without this branch "Sign in with
// WitUS" would be a one-click second-factor bypass for every account that has MFA enabled. The
// verdict is computed from `supabase.auth.getUser()` (a server-validated round trip, reached via
// mfa.listFactors), never from the cookie's unsigned user object; middleware.ts re-runs the same
// check on every protected request, so a user who edits the redirect out of the address bar still
// cannot reach /dashboard or /admin at aal1.
//
// NOTE (verify live): step 4 mints a session via admin.generateLink('magiclink') +
// verifyOtp({ token_hash }). This is the one part that cannot be unit-tested and is the most
// Supabase-version-sensitive. If sign-in lands back on /login with ?error=witus_verify, the likely
// fix is the verifyOtp `type` ('magiclink' vs 'email') for @supabase/supabase-js v2.75 /
// @supabase/ssr v0.7.

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { WITUS_CALLBACK_PATH, withAttemptMarker } from '@/lib/auth/witus-sso';
import { postWitusSignInPath } from '@/lib/auth/route-guard';
import { mfaVerificationPending } from '@/lib/mfa/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_URL =
  process.env.WITUS_OIDC_TOKEN_URL ?? 'https://accounts.witus.online/api/idp/oauth2/token';
const USERINFO_URL =
  process.env.WITUS_OIDC_USERINFO_URL ?? 'https://accounts.witus.online/api/idp/oauth2/userinfo';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get('witus_oauth_state')?.value;
  const verifier = cookieStore.get('witus_oauth_verifier')?.value;

  const clearTransient = () => {
    cookieStore.set({ name: 'witus_oauth_state', value: '', maxAge: 0, path: '/' });
    cookieStore.set({ name: 'witus_oauth_verifier', value: '', maxAge: 0, path: '/' });
  };
  const fail = (reason: string) => {
    clearTransient();
    // `?sso=tried` is the half of the "Continue as ..." loop guard that survives a browser with no
    // usable sessionStorage (and a return into a different tab). Without it, a stale IdP session
    // gives: probe says "Continue as X" -> click -> the IdP cannot finish -> back here -> /login ->
    // probe -> forever. See lib/auth/witus-sso.ts.
    return NextResponse.redirect(new URL(withAttemptMarker(`/login?error=${reason}`), request.url));
  };

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return fail('witus_state');
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const redirectUri = `${siteUrl.replace(/\/$/, '')}${WITUS_CALLBACK_PATH}`;

  // 1. Exchange the authorization code for tokens.
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.WITUS_OIDC_CLIENT_ID ?? '',
      client_secret: process.env.WITUS_OIDC_CLIENT_SECRET ?? '',
      code_verifier: verifier,
    }),
    cache: 'no-store',
  });
  if (!tokenRes.ok) return fail('witus_token');
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return fail('witus_token');

  // 2. Read claims from userinfo.
  const userinfoRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: 'no-store',
  });
  if (!userinfoRes.ok) return fail('witus_userinfo');
  const claims = (await userinfoRes.json()) as { sub?: string; email?: string };
  const sub = claims.sub;
  const email = claims.email;
  if (!sub || !email) return fail('witus_claims');

  // 3. Find-or-create the Supabase user by email (service role bypasses RLS).
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  // Idempotent: ignore "email already registered". The on-signup trigger creates the profiles row;
  // existing users are matched by email below.
  await admin.auth.admin.createUser({ email, email_confirm: true }).catch(() => undefined);

  // 4. Mint a Supabase session for this user (see NOTE at top).
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !tokenHash) return fail('witus_session');

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        async remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    },
  );
  const { data: verified, error: verifyErr } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  });
  if (verifyErr || !verified.user) return fail('witus_verify');

  // Link WitUS sub -> Supabase user id for subsequent logins.
  await admin
    .from('witus_identities')
    .upsert({ user_id: verified.user.id, witus_sub: sub }, { onConflict: 'witus_sub' });

  // 5. The MFA gate. `listFactors()` goes through `getUser()`, so the factor list is the
  // SERVER-VALIDATED one rather than the auth cookie's copy; the assurance level comes off the
  // session that was just minted. An account with a verified TOTP factor lands on
  // /login?mfa=pending and gets exactly the MfaVerifyStep a password login gets. An account with no
  // factor goes straight to the dashboard, which is also exactly what a password login does.
  //
  // FAIL CLOSED, AND CHECK THE `error` FIELDS TO DO IT. supabase-js returns `{ data, error }`
  // instead of throwing, so `lib/mfa/helpers.ts`'s `getAalAndFactors` — which drops `error` and
  // falls back to `aal1` / "no factors" — would quietly fail OPEN here: one flaky call to the auth
  // server and an enrolled account walks to the dashboard. So this reads both errors itself and
  // treats either one as "still owes a factor". The cost of a false positive is one extra trip
  // through /login, which re-checks; the cost of a false negative is the bypass this step exists to
  // prevent. (middleware.ts would still stop them at the dashboard door — this is defence in depth,
  // not the only line.)
  let mfaPending = true;
  try {
    const [aal, factors] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    if (!aal.error && !factors.error) {
      mfaPending = mfaVerificationPending({
        hasVerifiedTotp: (factors.data?.totp ?? []).some((f) => f.status === 'verified'),
        currentLevel: aal.data?.currentLevel ?? 'aal1',
        nextLevel: aal.data?.nextLevel ?? 'aal1',
      });
    }
  } catch {
    // Stays true. Same reasoning as above.
  }

  clearTransient();
  return NextResponse.redirect(new URL(postWitusSignInPath(mfaPending), request.url));
}
