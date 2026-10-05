// File: lib/auth/admin-verdict.ts
// Who may call an admin API route: the pure decision behind `requireAdmin()`.
//
// THE RULE. The caller must be signed in, must be the admin account (ADMIN_EMAIL), and the session
// must be at aal2, meaning the second factor was verified in this session. A password-only (aal1)
// session on the admin account is refused, whether or not that account has a factor enrolled.
//
// HOW THIS RELATES TO THE /admin PAGES. Middleware (lib/auth/route-guard.ts) holds back any session
// that still owes a factor it has enrolled. For an admin with TOTP enrolled, that is the same rule
// as this one. For an admin account with NO factor enrolled, the pages still render, but every admin
// API answers 403 with `code: 'mfa_required'` and a message telling the admin to turn on two-factor.
// That is deliberate: "admin APIs require MFA" means the admin account cannot act without a second
// factor at all.
//
// Deliberately IMPORT-FREE, like route-guard.ts, so the node test runner loads it directly
// (tests/admin-guard.test.ts).

export type AdminDenial = {
  ok: false;
  status: 401 | 403;
  error: string;
  code: 'signed_out' | 'not_admin' | 'mfa_required';
};

export type AdminVerdict = { ok: true } | AdminDenial;

export const ADMIN_MFA_ENROL_MESSAGE =
  'Admin actions need two-factor sign-in. Turn on two-factor authentication in Settings, then sign in again.';
export const ADMIN_MFA_VERIFY_MESSAGE =
  'Admin actions need two-factor sign-in. Sign out, then sign in again with your authenticator code.';

export function adminVerdict(input: {
  /** Did `supabase.auth.getUser()` (server-validated) return a user? */
  signedIn: boolean;
  /** That user's email. */
  email: string | null | undefined;
  /** process.env.ADMIN_EMAIL. Unset or blank means nobody is admin (fail closed). */
  adminEmail: string | null | undefined;
  /** The session's assurance level (the `aal` claim of the validated access token). */
  currentLevel: string | null | undefined;
  /** Does the user have a verified TOTP factor (from the getUser() factor list)? */
  hasVerifiedTotp: boolean;
}): AdminVerdict {
  if (!input.signedIn) {
    return { ok: false, status: 401, error: 'Unauthorized', code: 'signed_out' };
  }
  const adminEmail = input.adminEmail?.trim();
  if (!adminEmail || !input.email || input.email !== adminEmail) {
    return { ok: false, status: 403, error: 'Forbidden', code: 'not_admin' };
  }
  if (input.currentLevel !== 'aal2') {
    return {
      ok: false,
      status: 403,
      error: input.hasVerifiedTotp ? ADMIN_MFA_VERIFY_MESSAGE : ADMIN_MFA_ENROL_MESSAGE,
      code: 'mfa_required',
    };
  }
  return { ok: true };
}
