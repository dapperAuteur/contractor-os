'use client';

// File: lib/auth/witus-sso-client.tsx
// Client-side context + hook for the server-resolved ecosystem SSO config. The server root layout
// hydrates this once (see app/layout.tsx); client components — the login button, the nav menus with
// a logout row, SiteHeader — consume it with useWitusSso().
//
// Same shape and the same reason as the PostHog key already threaded through app/layout.tsx: every
// sign-in and sign-out affordance in this app lives inside a 'use client' tree, so the only way to
// give them a SERVER-resolved value is to read it in the server layout and pass it down. A client
// component must never read process.env.WITUS_OIDC_* itself.

import { createContext, useContext, useEffect, useState } from 'react';
import {
  WITUS_SSO_DISABLED,
  onRegisteredOrigin,
  signOutLabel,
  witusLogoutUrl,
  type WitusSsoConfig,
} from './witus-sso';

const WitusSsoContext = createContext<WitusSsoConfig>(WITUS_SSO_DISABLED);

export function WitusSsoProvider({
  value,
  children,
}: {
  value: WitusSsoConfig;
  children: React.ReactNode;
}) {
  return <WitusSsoContext.Provider value={value}>{children}</WitusSsoContext.Provider>;
}

/**
 * The ecosystem SSO config for this render. Defaults to the fully dark config, so a component that
 * somehow renders outside the provider degrades to today's behaviour (local-only sign-out, no WitUS
 * button) rather than to a broken affordance.
 */
export function useWitusSso(): WitusSsoConfig {
  return useContext(WitusSsoContext);
}

/**
 * The IdP logout URL to navigate to after the local session is destroyed, or null when sign-out
 * must stay local.
 *
 * Null whenever this app is not a configured ecosystem client, OR the browser is on a host the IdP
 * does not know. This project also serves www.badcba.com, where `post_logout_redirect_uri` would be
 * an unregistered URI and better-auth answers 400 — so on that host sign-out stays exactly what it
 * is today.
 *
 * RESOLVED AFTER MOUNT, not during render. One deployment serves two hosts, so the server cannot
 * know which one this is without `headers()`, and paying for that in the root layout would make the
 * whole app dynamic (see lib/auth/witus-sso-server.ts). Reading `window.location.origin` during
 * render instead would hydrate a different label than the server sent. So it starts null — today's
 * purely local sign-out, today's "Logout" copy — and upgrades once mounted on the registered host.
 *
 * USE IT AFTER `supabase.auth.signOut()`, NEVER BEFORE. Order is the safety property: destroy the
 * local session first, so an unreachable or refusing IdP still leaves the person signed out here.
 * Handing off first turns any IdP failure into "I clicked sign out and I'm still signed in."
 */
export function useGlobalSignOutUrl(): string | null {
  const { endSessionUrl, appOrigin } = useWitusSso();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!endSessionUrl || !appOrigin) {
      setUrl(null);
      return;
    }
    setUrl(
      onRegisteredOrigin(appOrigin, window.location.origin)
        ? witusLogoutUrl(endSessionUrl, appOrigin)
        : null,
    );
  }, [endSessionUrl, appOrigin]);

  return url;
}

/**
 * What the logout row in the nav should say.
 *
 * "Logout" — this app's existing word — until we know the click will end the shared session too, at
 * which point it becomes "Sign out of WitUS". A control that signs you out of a dozen other apps
 * should admit it before you press it. Follows `useGlobalSignOutUrl`'s after-mount resolution, so
 * the first paint is always today's copy and there is no hydration mismatch.
 */
export function useSignOutLabel(): string {
  return signOutLabel(useGlobalSignOutUrl());
}
