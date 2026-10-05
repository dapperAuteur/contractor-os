// File: lib/auth/require-admin.ts
// The one admin check every admin API route uses. Returns the admin user, or a ready 401/403
// response. The decision itself is the pure `adminVerdict()` (lib/auth/admin-verdict.ts); this file
// does the I/O: read the session from the request cookies and work out its assurance level.
//
// Usage:
//   const auth = await requireAdmin();
//   if (!auth.ok) return auth.response;
//   const user = auth.user;
//
// WHY THE FACTOR LIST COMES FROM getUser(). Same reasoning as mfaPendingFor() in middleware.ts:
// `getUser()` validates the access token against the auth server, so its user (and factor list) is
// authoritative, and the token's `aal` claim, which getAuthenticatorAssuranceLevel() reads, can be
// trusted once that same token has been validated.

import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { adminVerdict } from '@/lib/auth/admin-verdict';

export type AdminAuth = { ok: true; user: User } | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<AdminAuth> {
  const supabase = await createClient();

  let user: User | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const hasVerifiedTotp = (user?.factors ?? []).some(
    (factor) => factor.factor_type === 'totp' && factor.status === 'verified',
  );

  // Only the admin account needs its assurance level read; everyone else is refused first.
  // Fail closed: an unreadable level counts as not aal2.
  let currentLevel: string | null = null;
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (user && adminEmail && user.email === adminEmail) {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      currentLevel = data?.currentLevel ?? null;
    } catch {
      currentLevel = null;
    }
  }

  const verdict = adminVerdict({
    signedIn: Boolean(user),
    email: user?.email,
    adminEmail,
    currentLevel,
    hasVerifiedTotp,
  });

  if (!verdict.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: verdict.error, code: verdict.code }, { status: verdict.status }),
    };
  }
  if (!user) {
    // Unreachable (signedIn was false), but keeps the type honest.
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true, user };
}
