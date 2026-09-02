// File: lib/auth/witus-sso-server.ts
// Server-side resolution of the ecosystem SSO endpoints. Called ONCE, from the root layout
// (app/layout.tsx), and the result is handed to client components through WitusSsoProvider.
//
// This module reads process.env, so it must never be imported by a 'use client' module. That is the
// whole reason it is split from ./witus-sso.ts: the client needs the pure helpers, not the env.
// Same pattern the root layout already uses for the PostHog key ("read here, in a Server Component,
// and pass it down").

import {
  WITUS_OIDC_AUTHORIZE_FALLBACK,
  WITUS_SSO_DISABLED,
  endSessionEndpointFromAuthorizeUrl,
  silentSsoEndpointFromAuthorizeUrl,
  type WitusSsoConfig,
} from './witus-sso';

/**
 * Resolve the ecosystem SSO configuration for this deployment.
 *
 * Returns the fully dark config unless BOTH `WITUS_OIDC_CLIENT_ID` and `NEXT_PUBLIC_SITE_URL` are
 * set. Without the client id this app is not a registered ecosystem client, so there is no shared
 * session to probe and none to end. Without the site URL we cannot tell which of this project's two
 * hosts is the registered one, and guessing is the failure this whole file is arranged to avoid.
 * Dark means the "Sign in with WitUS" button renders nothing at all and sign-out stays purely
 * local: an affordance the visitor cannot complete is worse than none.
 *
 * HOST GATING — WHY IT IS RESOLVED FROM ENV AND NOT FROM `headers()`. This one Vercel project serves
 * both work.witus.online and www.badcba.com (README, "One deployment, two hosts"), and only the
 * first is in the IdP registry, so the affordance must appear on the first and not the second.
 * Reading the request host with `headers()` in the ROOT LAYOUT would opt this app's entire route
 * tree — every marketing page, every blog post — into dynamic rendering, which is a real cost paid
 * on every request to buy nothing: the registered origin is a fixed deployment constant, not a
 * per-request fact. So the server publishes the registered origin, and the two client call sites
 * compare it against `window.location.origin` before making any request (see `onRegisteredOrigin`).
 * That comparison reads the browser's own true origin — it is not attacker-supplied input, and it
 * is not being used to grant anything; it only decides whether an affordance appears.
 *
 * This app is NOT white-label. It has no tenant hosting and no per-customer branding
 * (CLAUDE.md, "App Architecture": standalone Work.WitUS app, no subdomain detection, login and
 * signup always show Work.WitUS branding); www.badcba.com is a second brand of the same owner,
 * whose footer already links to WitUS.online on every page. The host gate here is therefore about
 * correctness — an unregistered origin cannot complete any leg of the flow — rather than about
 * concealing the ecosystem from a customer. If tenant hosting is ever added, THIS is the function
 * that must grow a real per-request host check, and the cost of `headers()` becomes worth paying.
 */
export function resolveWitusSsoConfig(): WitusSsoConfig {
  const clientId = process.env.WITUS_OIDC_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!clientId || !siteUrl) return WITUS_SSO_DISABLED;

  let appOrigin: string;
  try {
    appOrigin = new URL(siteUrl).origin;
  } catch {
    // A malformed NEXT_PUBLIC_SITE_URL is a deployment bug. Fail dark rather than emit a button
    // that sends an unparseable redirect_uri.
    return WITUS_SSO_DISABLED;
  }

  const authorizeUrl = process.env.WITUS_OIDC_AUTHORIZE_URL ?? WITUS_OIDC_AUTHORIZE_FALLBACK;
  const endSessionBase = endSessionEndpointFromAuthorizeUrl(authorizeUrl);

  return {
    enabled: true,
    // An explicit override wins, because that path is owned by the IdP app, not by this one.
    silentCheckUrl:
      process.env.WITUS_SSO_SESSION_URL ?? silentSsoEndpointFromAuthorizeUrl(authorizeUrl),
    // client_id IS REQUIRED, not optional. better-auth's endSession endpoint rejects a
    // post_logout_redirect_uri with invalid_request ("client_id is required when using
    // post_logout_redirect_uri without a valid id_token_hint") unless the request carries either a
    // verifiable id_token_hint or an explicit client_id. We have no id_token client-side, so we
    // send client_id — baked in HERE, on the server, because the sign-out call sites are client
    // components and must not be handed the raw env.
    endSessionUrl: endSessionBase
      ? `${endSessionBase}?client_id=${encodeURIComponent(clientId)}`
      : null,
    appOrigin,
  };
}
