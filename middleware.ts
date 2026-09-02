// File: middleware.ts
// Protects dashboard/admin routes, refreshes auth tokens, and holds a session that still owes a
// second factor at the door.
//
// The routing decision itself lives in lib/auth/route-guard.ts as a pure function so it can be
// tested (tests/witus-sso.test.ts). This file keeps the I/O: read the session, work out the
// assurance level, apply the verdict.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { authRouteVerdict } from '@/lib/auth/route-guard';
import { mfaVerificationPending } from '@/lib/mfa/helpers';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars in middleware');
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    console.error('Middleware: failed to get user session');
    return response;
  }
  const { pathname } = request.nextUrl;

  const verdict = authRouteVerdict({
    pathname,
    signedIn: Boolean(user),
    isAdmin: Boolean(user && user.email === process.env.ADMIN_EMAIL),
    mfaPending: await mfaPendingFor(supabase, user),
  });

  if (verdict.action === 'redirect') {
    return NextResponse.redirect(new URL(verdict.to, request.url));
  }
  return response;
}

/**
 * Does this session still owe a second factor?
 *
 * WHY THE MIDDLEWARE ASKS AT ALL. It did not before: MFA was enforced only by the login page's own
 * client-side branch, in the tab that signed in, which meant `?mfa=pending` — a parameter
 * app/login/page.tsx has always handled — was never actually produced by anything. Adding "Sign in
 * with WitUS" made that gap load-bearing: the OIDC callback mints an ordinary aal1 Supabase session
 * server-side, so unless something on the server holds it back, an ecosystem sign-in reaches
 * /dashboard at aal1 while a password sign-in to the same account does not. BAM's call
 * (2026-09-02): SSO must not be a way to skip MFA. Enforcing it HERE rather than in the callback
 * alone is what makes that true for a visitor who simply types the dashboard URL.
 *
 * WHY `user.factors` AND NOT `nextLevel` ALONE. `getAuthenticatorAssuranceLevel()` derives
 * `nextLevel` from `session.user.factors`, and @supabase/ssr keeps that user object as plain JSON
 * beside the signed access token in the auth cookie. A client that strips `factors` from its own
 * cookie would get `nextLevel: "aal1"` and walk through. The `user` handed in here comes from
 * `supabase.auth.getUser()`, which validates against the auth server, so its factor list is the
 * authoritative one. `currentLevel` is then safe to read from the token, because getUser() has just
 * proven that token genuine.
 *
 * COST: zero extra network calls in the common case. `getUser()` already ran above, and the
 * assurance-level lookup is a local JWT decode that only happens for an account that actually has a
 * verified factor.
 */
async function mfaPendingFor(supabase: SupabaseClient, user: User | null): Promise<boolean> {
  if (!user) return false;

  const hasVerifiedTotp = (user.factors ?? []).some(
    (factor) => factor.factor_type === 'totp' && factor.status === 'verified',
  );
  if (!hasVerifiedTotp) return false;

  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return mfaVerificationPending({
      hasVerifiedTotp,
      currentLevel: data?.currentLevel ?? 'aal1',
      nextLevel: data?.nextLevel ?? 'aal1',
    });
  } catch {
    // Fail CLOSED: an enrolled account whose assurance level cannot be read is treated as still
    // owing its second factor. The cost is one extra trip through /login, which re-checks; the cost
    // of failing open is the bypass this function exists to prevent.
    return true;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login', '/signup'],
};
