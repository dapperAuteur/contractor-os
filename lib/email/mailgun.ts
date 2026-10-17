// File: lib/email/mailgun.ts
// Work.WitUS outgoing email through Mailgun's HTTP API (plain fetch, no SDK).
//
// Env:
//   MAILGUN_API_KEY  required. Private API key, sent as HTTP basic auth `api:<key>`.
//   MAILGUN_DOMAIN   required. The sending domain verified in Mailgun.
//   EMAIL_FROM       required. From header, e.g. "Work.WitUS <notify@your-verified-domain>".
//   MAILGUN_REGION   optional. "us" or "eu". DEFAULT: "us" when unset (a default, not a value
//                    read from Mailgun: an EU-hosted domain must set "eu" or every send 401s/404s).
//
// Base URLs per Mailgun's API overview
// (https://documentation.mailgun.com/docs/mailgun/api-reference/api-overview):
//   US: https://api.mailgun.net/    EU: https://api.eu.mailgun.net/
// Messages endpoint: POST {base}/v3/{domain}/messages, form-encoded.
//
// Missing config never throws: it logs once and returns { sent: false, reason: 'not_configured' }.
// Send failures never throw either; callers decide whether a failure matters.
//
// Pure: imports only ./sender.ts, so the Node test runner can load it (tests/email-mailgun.test.ts).

import { getSenderEmail } from './sender.ts';

type Env = Record<string, string | undefined>;
type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export const MAILGUN_BASE_URLS = {
  us: 'https://api.mailgun.net',
  eu: 'https://api.eu.mailgun.net',
} as const;

/** Mailgun's documented cap on recipients in one batch message. */
export const MAILGUN_BATCH_MAX = 1000;

export type RecipientVariables = Record<string, Record<string, string | number>>;

export interface SendEmailInput {
  /** One address, or several for a batch send (each recipient gets their own copy). */
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text part. Always required: every Work.WitUS email ships a text alternative. */
  text: string;
  replyTo?: string;
  /** Mailgun tags (o:tag), for filtering in the Mailgun dashboard. Max 3 per message. */
  tags?: string[];
  /** Turn off open and click tracking (no pixel, no rewritten links). Defaults to true. */
  noTracking?: boolean;
  /**
   * Per-recipient values for %recipient.key% placeholders. When `to` has more than one address
   * and this is omitted, an empty entry per recipient is sent anyway: without recipient-variables
   * Mailgun puts every address in every copy's To header.
   */
  recipientVariables?: RecipientVariables;
}

export type SendEmailResult =
  | { sent: true; id: string | null }
  | {
      sent: false;
      reason: 'not_configured' | 'no_recipients' | 'api_error' | 'network_error';
      status?: number;
      error?: string;
    };

export interface MailDeps {
  env?: Env;
  fetch?: FetchLike;
  log?: (message: string) => void;
}

let warnedMissing = false;

interface MailConfig {
  apiKey: string;
  domain: string;
  from: string;
  baseUrl: string;
}

function readConfig(env: Env, log: (m: string) => void): MailConfig | null {
  const apiKey = env.MAILGUN_API_KEY?.trim();
  const domain = env.MAILGUN_DOMAIN?.trim();
  const from = getSenderEmail(env, log);
  if (!apiKey || !domain || !from) {
    if (!warnedMissing) {
      warnedMissing = true;
      const missing = [!apiKey && 'MAILGUN_API_KEY', !domain && 'MAILGUN_DOMAIN', !from && 'EMAIL_FROM']
        .filter(Boolean)
        .join(', ');
      log(`[email] Mailgun is not configured (missing ${missing}). Skipping outgoing email.`);
    }
    return null;
  }
  return { apiKey, domain, from, baseUrl: mailgunBaseUrl(env) };
}

/** US unless MAILGUN_REGION is "eu" (case-insensitive). US is the documented default. */
export function mailgunBaseUrl(env: Env = process.env): string {
  return env.MAILGUN_REGION?.trim().toLowerCase() === 'eu' ? MAILGUN_BASE_URLS.eu : MAILGUN_BASE_URLS.us;
}

/** True when API key, domain and sender are all set, i.e. sendEmail() will really try to send. */
export function mailConfigured(env: Env = process.env): boolean {
  return !!(env.MAILGUN_API_KEY?.trim() && env.MAILGUN_DOMAIN?.trim() && env.EMAIL_FROM?.trim());
}

export async function sendEmail(input: SendEmailInput, deps: MailDeps = {}): Promise<SendEmailResult> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.warn;
  const doFetch: FetchLike = deps.fetch ?? ((url, init) => fetch(url, init));

  const cfg = readConfig(env, log);
  if (!cfg) return { sent: false, reason: 'not_configured' };

  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map((r) => r.trim()).filter(Boolean);
  if (recipients.length === 0) return { sent: false, reason: 'no_recipients' };

  const body = new URLSearchParams();
  body.set('from', cfg.from);
  for (const r of recipients) body.append('to', r);
  body.set('subject', input.subject);
  body.set('text', input.text);
  body.set('html', input.html);
  if (input.replyTo) body.set('h:Reply-To', input.replyTo);
  for (const tag of (input.tags ?? []).slice(0, 3)) body.append('o:tag', tag);
  if (input.noTracking !== false) {
    body.set('o:tracking', 'no');
    body.set('o:tracking-clicks', 'no');
    body.set('o:tracking-opens', 'no');
  }
  if (recipients.length > 1 || input.recipientVariables) {
    const vars: RecipientVariables = {};
    for (const r of recipients) vars[r] = input.recipientVariables?.[r] ?? {};
    body.set('recipient-variables', JSON.stringify(vars));
  }

  try {
    const res = await doFetch(`${cfg.baseUrl}/v3/${encodeURIComponent(cfg.domain)}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`api:${cfg.apiKey}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      log(`[email] Mailgun send failed (${res.status}): ${detail}`);
      return { sent: false, reason: 'api_error', status: res.status, error: detail };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: json.id ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    log(`[email] Mailgun request failed: ${message}`);
    return { sent: false, reason: 'network_error', error: message };
  }
}

/** Split a list into chunks of at most `size` (default: Mailgun's batch cap). */
export function chunk<T>(items: T[], size: number = MAILGUN_BATCH_MAX): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Test-only: reset the log-once latch. */
export function resetMailgunWarningForTests(): void {
  warnedMissing = false;
}
