// lib/site-url.ts
// The one place this app decides its own public origin.
//
// `NEXT_PUBLIC_SITE_URL` wins when it is set. Without it:
//   - Vercel production     -> https://work.witus.online (PRODUCTION_SITE_URL)
//   - Vercel preview        -> https://<VERCEL_URL> (that deployment's own URL)
//   - next dev / tests      -> http://localhost:3000
// The fallbacks used to be scattered literals, several of them 'https://work.witus.com', a domain
// this app has never had. PRODUCTION_SITE_URL is the host the WitUS IdP has registered for slug
// `work` (redirect URI https://work.witus.online/api/auth/witus/callback, CLAUDE.md "App
// Architecture"), so it is a known value, not a guess.
//
// FOREIGN ORIGIN WARNING. On 2026-11-04 production's NEXT_PUBLIC_SITE_URL was found set to
// https://www.centenarianos.com, another ecosystem app, which hid "Sign in with WitUS" and pointed
// emailed links at the wrong product. A configured origin is still honored (config is the operator's
// call), but the server logs one warning per process when it is not one of this app's own hosts.
//
// SSO: the redirect_uri must come from the CONFIGURED value, never from the request host or from a
// fallback, so the SSO code uses `getConfiguredSiteUrl()` (null when unset, and SSO stays dark), not
// `getSiteUrl()`.
//
// Client components may import this: it reads `process.env.NEXT_PUBLIC_SITE_URL` literally so Next
// inlines it; VERCEL_ENV and VERCEL_URL are server-only and read as undefined in the browser.

export const PRODUCTION_SITE_URL = 'https://work.witus.online';
export const DEVELOPMENT_SITE_URL = 'http://localhost:3000';

/** Hosts this one Vercel project serves (README, "One deployment, two hosts"), plus dev hosts. */
export const OWN_HOSTS = ['work.witus.online', 'www.badcba.com', 'localhost', '127.0.0.1'] as const;

export interface SiteUrlEnv {
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
  NODE_ENV?: string;
}

/** The configured origin without a trailing slash, or null when unset or not a URL. */
export function parseConfiguredOrigin(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  try {
    return new URL(v).origin;
  } catch {
    return null;
  }
}

/** True for work.witus.online, www.badcba.com, localhost/127.0.0.1 and *.vercel.app previews. */
export function isOwnOrigin(origin: string): boolean {
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (OWN_HOSTS as readonly string[]).includes(host) || host.endsWith('.vercel.app');
}

/** Pure resolution, for tests. */
export function resolveSiteUrl(env: SiteUrlEnv): string {
  const configured = parseConfiguredOrigin(env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;
  if (env.VERCEL_ENV === 'production') return PRODUCTION_SITE_URL;
  if (env.VERCEL_ENV === 'preview' && env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  if (env.NODE_ENV === 'production' && !env.VERCEL_ENV) {
    // `next build` runs with NODE_ENV=production; on Vercel VERCEL_ENV is also set. In the browser
    // VERCEL_ENV is undefined, so a production bundle lands here too.
    return PRODUCTION_SITE_URL;
  }
  return DEVELOPMENT_SITE_URL;
}

/** The warning text for a configured origin that is not ours, or null when it is fine. */
export function foreignSiteUrlWarning(env: SiteUrlEnv): string | null {
  const configured = parseConfiguredOrigin(env.NEXT_PUBLIC_SITE_URL);
  if (env.NEXT_PUBLIC_SITE_URL?.trim() && !configured) {
    return '[site-url] NEXT_PUBLIC_SITE_URL is set but is not a valid URL; using the default origin instead.';
  }
  if (!configured || isOwnOrigin(configured)) return null;
  const host = new URL(configured).hostname;
  return `[site-url] NEXT_PUBLIC_SITE_URL points at ${host}, which is not one of this app's hosts ` +
    `(${OWN_HOSTS.slice(0, 2).join(', ')}, localhost, *.vercel.app). Links, emails and Sign in with ` +
    `WitUS will use it. Set it to ${PRODUCTION_SITE_URL} on Production and redeploy (it is inlined at build).`;
}

function currentEnv(): SiteUrlEnv {
  return {
    // Literal property reads so Next inlines the NEXT_PUBLIC_ value into client bundles.
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
}

let warned = false;

/** Log the foreign-origin warning once per server process. No-op in the browser. */
export function warnIfForeignSiteUrl(
  env: SiteUrlEnv = currentEnv(),
  log: (msg: string) => void = console.warn,
): void {
  if (warned || typeof window !== 'undefined') return;
  const msg = foreignSiteUrlWarning(env);
  if (!msg) return;
  warned = true;
  log(msg);
}

/** Test hook: let the warning fire again. */
export function resetSiteUrlWarningForTests(): void {
  warned = false;
}

/** This app's public origin (no trailing slash): configured, or the default for this environment. */
export function getSiteUrl(): string {
  const env = currentEnv();
  warnIfForeignSiteUrl(env);
  return resolveSiteUrl(env);
}

/**
 * The configured origin only, or null. For the SSO redirect_uri and the push VAPID subject, which
 * must never be derived from a fallback or the request host.
 */
export function getConfiguredSiteUrl(): string | null {
  const env = currentEnv();
  warnIfForeignSiteUrl(env);
  return parseConfiguredOrigin(env.NEXT_PUBLIC_SITE_URL);
}
