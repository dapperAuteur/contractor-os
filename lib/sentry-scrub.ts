// File: lib/sentry-scrub.ts
// Strips secrets and personal data out of a Sentry event before it leaves the server.
//
// Why this file exists
// --------------------
// Work.WitUS handles employment records. A crash report from this app can otherwise carry:
//   • a union member's document (`/api/contractor/union/documents/...`, Cloudinary asset URLs):
//     dues history, membership status, uploaded contracts;
//   • an invite flow's email address and the Supabase auth `?code=` exchange param, a working
//     credential for somebody else's account;
//   • a job record's request BODY (client name, site address, crew, rates) echoed into the error;
//   • the Supabase service-role key or a session JWT, both `eyJ…` strings that show up verbatim in
//     fetch errors.
// None of that belongs in a third-party error tracker, so `beforeSend` runs everything through here.
//
// The bias is deliberate: REDACT WHEN UNSURE. An over-redacted crash report costs a few minutes of
// triage; an under-redacted one leaks a contractor's employment data to a vendor. This module never
// returns null: we still want the stack trace, just without the credentials attached.
//
// Pure and dependency-free (no `server-only`, no Supabase import) so it is directly unit-testable.
// See tests/sentry-scrub.test.ts.

import type { ErrorEvent } from '@sentry/nextjs';

export const REDACTED_URL = '[redacted url]';
export const REDACTED_VALUE = '[redacted]';
export const REDACTED_EMAIL = '[redacted email]';

/** Absolute http(s) URLs. Trailing punctuation is excluded so we replace the URL, not the prose. */
const URL_RE = /https?:\/\/[^\s<>"'`)\]}]+/g;

/** Any email address. Contractor, lister, crew contact, invited peer, all of them are personal. */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** A JWT. Supabase session tokens, the anon key and the SERVICE-ROLE key are all `eyJ…` strings. */
const JWT_RE = /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]+/g;

/** A record id. Not a bearer secret, but still an identifier we do not need off-site. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A path segment that looks generated: long, and from the alphabet our token sources actually use
 *  (hex / base64url / nanoid / Cloudinary public ids). Deliberately loose. */
const TOKENISH_SEGMENT_RE = /^[A-Za-z0-9_-]{16,}$/;

/** Routes that are token-redemption or credential endpoints by construction. Anything under these
 *  is dropped whole, whether or not the token itself "looks" random. */
const SECRET_PATH_RE =
  /^\/(api\/auth|auth|invite|invites|join|accept|reset-password|forgot-password|set-password|confirm|activate|unsubscribe|magic-link)(\/|$)/i;

/** A storage-object URL IS the uploaded file (a scanned licence, a union contract, a signed
 *  invoice), so it is treated as the payload and never sent, not even its path. */
const FILE_PATH_RE = /\/storage\/v1\/(object|render)(\/|$)/i;

/** Cloudinary serves this app's uploaded documents and photos. Same reasoning as above. */
const CLOUDINARY_HOST_RE = /(^|\.)cloudinary\.com$/i;

/**
 * A labelled raw secret that is not a URL: `password: hunter2`, `service_role key = eyJ…`,
 * `one-time code is 998812`. The separator is REQUIRED so ordinary prose ("pin the invoice to the
 * job") survives untouched.
 */
const SECRET_LABEL_RE =
  /\b(pin|password|passcode|secret|api[_\s-]?key|anon[_\s-]?key|service[_\s-]?role(?:[_\s-]?key)?|access[_\s-]?token|refresh[_\s-]?token|id[_\s-]?token|bearer|authorization|otp|one[-\s]?time code|verification code|invite code|cron[_\s-]?secret|webhook[_\s-]?secret)\b\s*(?:is|:|=)\s*["']?([^\s,;"'&]{3,})/gi;

/** Request headers that are credentials, or that identify the person behind the request. */
const DROPPED_HEADERS = new Set([
  'cookie',
  'set-cookie',
  'authorization',
  'proxy-authorization',
  'apikey',
  'api-key',
  'x-api-key',
  'x-supabase-auth',
  'x-supabase-api-key',
  'x-cron-secret',
  'x-forwarded-for',
  'x-real-ip',
  'x-client-ip',
  'cf-connecting-ip',
  'true-client-ip',
  'x-vercel-forwarded-for',
  'x-vercel-proxied-for',
  'x-vercel-ja4-digest',
]);

/** Header-name prefixes dropped wholesale (Vercel's geo-IP family: city, country, latitude…). */
const DROPPED_HEADER_PREFIXES = ['x-vercel-ip-'];

function isDroppedHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return DROPPED_HEADERS.has(lower) || DROPPED_HEADER_PREFIXES.some((p) => lower.startsWith(p));
}

/** Mask the generated-looking parts of a path so `/documents/<id>` still tells us the route. */
function maskPath(pathname: string): string {
  return pathname
    .split('/')
    .map((seg) => {
      if (UUID_RE.test(seg)) return '<id>';
      if (TOKENISH_SEGMENT_RE.test(seg)) return '<token>';
      return seg;
    })
    .join('/');
}

/**
 * Reduce a URL to the least that is still useful for triage: scheme, host, masked path. The query
 * string is ALWAYS dropped (Supabase REST filters embed emails, user ids and job ids; the auth
 * callback embeds `?code=`), and a URL that is itself the payload is dropped entirely.
 *
 * Returns the placeholder for anything unparseable, which is exactly the case where we cannot
 * reason about it, and the rule is "redact when unsure".
 */
export function redactUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return REDACTED_URL;
  }

  if (CLOUDINARY_HOST_RE.test(url.hostname)) return REDACTED_URL;
  if (FILE_PATH_RE.test(url.pathname)) return REDACTED_URL;
  if (SECRET_PATH_RE.test(url.pathname)) return REDACTED_URL;

  const query = url.search ? '?<redacted>' : '';
  return `${url.origin}${maskPath(url.pathname)}${query}`;
}

/**
 * Remove every secret and every personal identifier from a free-text string (an exception message,
 * a breadcrumb, a header value). Order matters: URLs first, so a token sitting in a query string is
 * gone before the narrower patterns run over what is left.
 */
export function redactSecrets(text: string): string {
  return text
    .replace(URL_RE, (match) => redactUrl(match))
    .replace(JWT_RE, REDACTED_VALUE)
    .replace(SECRET_LABEL_RE, (_match, label: string) => `${label}: ${REDACTED_VALUE}`)
    .replace(EMAIL_RE, REDACTED_EMAIL);
}

function scrubStringValues(bag: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(bag)) {
    if (typeof value === 'string') bag[key] = redactSecrets(value);
  }
}

/**
 * Sentry `beforeSend`. Shared by the server, edge and browser runtimes so one change covers all
 * three. Never returns null: the crash signal is worth keeping, the credentials are not.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.message) event.message = redactSecrets(event.message);

  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redactSecrets(exception.value);
  }

  // Account identity and network origin: keep the opaque user id, drop everything else. A whitelist
  // rather than a denylist, so a future SDK field cannot quietly reintroduce PII.
  if (event.user) {
    const user = event.user as Record<string, unknown>;
    delete user.email;
    delete user.ip_address;
    delete user.username;
    for (const key of Object.keys(user)) {
      if (key !== 'id') delete user[key];
    }
  }

  if (event.request) {
    if (typeof event.request.url === 'string') event.request.url = redactUrl(event.request.url);
    // Query strings here carry auth codes and Supabase filters. Never shipped.
    delete event.request.query_string;
    delete event.request.cookies;
    // STRICT for Work.WitUS: a request body in this app is a union document, an invite, a contact,
    // or a job record. There is no version of it that is safe to send to an error tracker.
    delete event.request.data;

    const headers = event.request.headers as Record<string, string> | undefined;
    if (headers) {
      for (const name of Object.keys(headers)) {
        if (isDroppedHeader(name)) {
          delete headers[name];
          continue;
        }
        // `referer` routinely carries the token-bearing URL the user came from.
        const value = headers[name];
        if (typeof value === 'string') headers[name] = redactSecrets(value);
      }
    }
  }

  // Browser breadcrumbs record every fetch/XHR the page made, including document downloads and
  // Supabase queries, so they need the same pass as the exception itself.
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = redactSecrets(crumb.message);
    if (crumb.data) scrubStringValues(crumb.data as Record<string, unknown>);
  }

  if (event.extra) scrubStringValues(event.extra as Record<string, unknown>);

  return event;
}
