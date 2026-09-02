// lib/mfa/helpers.ts
// Shared MFA utilities for login, settings, the middleware route guard, and the WitUS SSO callback.

import { SupabaseClient } from '@supabase/supabase-js';

export async function getAalAndFactors(supabase: SupabaseClient) {
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  return {
    currentLevel: aalData?.currentLevel ?? 'aal1',
    nextLevel: aalData?.nextLevel ?? 'aal1',
    hasMfaEnabled: (factorsData?.totp ?? []).some((f) => f.status === 'verified'),
    factors: factorsData,
  };
}

export function needsMfaVerification(currentLevel: string, nextLevel: string) {
  return nextLevel === 'aal2' && currentLevel !== 'aal2';
}

/**
 * The one MFA verdict every entry point shares: does this session still owe a second factor?
 *
 * WHY THIS EXISTS ALONGSIDE `needsMfaVerification`. That helper reads `nextLevel`, which
 * @supabase/auth-js computes from `session.user.factors` — and `session` is read from the AUTH
 * COOKIE, whose user object is plain JSON riding next to the signed access token. A client that
 * edits its own cookie to drop `factors` gets `nextLevel: "aal1"` and would sail past a check that
 * trusts it. So callers pass `hasVerifiedTotp` derived from `supabase.auth.getUser()` — a
 * server-validated round trip — and this function ORs the two signals:
 *
 *   - enrolled + not yet at aal2                  -> pending, whatever `nextLevel` claims
 *   - `needsMfaVerification(current, next)` true  -> pending
 *
 * `currentLevel` stays safe to read from the token because the callers only reach here after
 * `getUser()` has validated that same token against the auth server.
 *
 * TOTP ONLY, deliberately. `components/login/MfaVerifyStep.tsx` can challenge a TOTP factor and
 * nothing else, so gating on a phone or WebAuthn factor would lock the account out of its own
 * second-factor screen rather than protect it. This app only ever enrols TOTP
 * (`app/dashboard/settings`), which is why the existing `getAalAndFactors().hasMfaEnabled` already
 * filters the same way.
 */
export function mfaVerificationPending(input: {
  hasVerifiedTotp: boolean;
  currentLevel: string;
  nextLevel?: string;
}): boolean {
  if (input.currentLevel === 'aal2') return false;
  if (input.hasVerifiedTotp) return true;
  return needsMfaVerification(input.currentLevel, input.nextLevel ?? input.currentLevel);
}
