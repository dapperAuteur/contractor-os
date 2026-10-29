'use client';

// components/nav/SignOutEverywhereButton.tsx
// "Sign out of WitUS everywhere": the SECOND, secondary sign-out control, placed beside the plain
// "Sign out" in the contractor and lister navs (desktop user menu and mobile drawer). BAM,
// 2026-10-29, witus task 128 option (b): "Sign out" ends only this app's Supabase session; this one
// ends it AND the shared WitUS session at the IdP. Other WitUS apps keep their own sessions, which
// the help text says.
//
// Renders nothing unless `useGlobalSignOutUrl()` resolves a URL: this app must be a configured
// ecosystem OIDC client AND the browser must be on the registered host. This deployment also serves
// www.badcba.com, which the IdP does not know, so that host never sees the control.

import { useId, useState } from 'react';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useGlobalSignOutUrl } from '@/lib/auth/witus-sso-client';
import {
  SIGN_OUT_EVERYWHERE_HELP,
  SIGN_OUT_EVERYWHERE_LABEL,
  signOutEverywhere,
} from '@/lib/auth/witus-sso';

export default function SignOutEverywhereButton({
  variant,
  onBeforeSignOut,
}: {
  /** `menu` sits in a role="menu" dropdown; `drawer` in the mobile drawer. */
  variant: 'menu' | 'drawer';
  /** e.g. close the menu or drawer before the page navigates away. */
  onBeforeSignOut?: () => void;
}) {
  const logoutUrl = useGlobalSignOutUrl();
  const helpId = useId();
  const [busy, setBusy] = useState(false);
  if (!logoutUrl) return null;

  const handleClick = () => {
    onBeforeSignOut?.();
    setBusy(true);
    // ORDER IS THE SAFETY PROPERTY: signOutEverywhere awaits the local Supabase sign-out BEFORE it
    // navigates to the IdP, so an unreachable or refusing IdP still leaves the person signed out
    // here. A full navigation, not router.push: this leaves our origin for the IdP, which then
    // returns to https://work.witus.online/. Do NOT add a restrictive Referrer-Policy to this app —
    // work.witus.online and accounts.witus.online are different registrable domains, so
    // better-auth's endSession handler only accepts this cross-site navigation because the
    // browser's default strict-origin-when-cross-origin referrer lets the IdP match it against its
    // trustedOrigins.
    void signOutEverywhere({
      signOutLocal: () => createClient().auth.signOut(),
      navigate: (url) => window.location.assign(url),
      logoutUrl,
    });
  };

  const buttonClass =
    variant === 'menu'
      ? 'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100 transition min-h-11 disabled:opacity-50'
      : 'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition min-h-11 disabled:opacity-50';

  return (
    <div className={variant === 'menu' ? 'pb-1' : ''} role={variant === 'menu' ? 'none' : undefined}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-describedby={helpId}
        className={buttonClass}
        role={variant === 'menu' ? 'menuitem' : undefined}
      >
        <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
        {busy ? 'Signing out…' : SIGN_OUT_EVERYWHERE_LABEL}
      </button>
      <p
        id={helpId}
        className={`text-xs text-slate-500 ${variant === 'menu' ? 'px-3' : 'px-4'}`}
      >
        {SIGN_OUT_EVERYWHERE_HELP}
      </p>
    </div>
  );
}
