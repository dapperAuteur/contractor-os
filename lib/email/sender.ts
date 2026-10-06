// File: lib/email/sender.ts
// The one place that decides which address Work.WitUS sends Resend email from.
//
// The sender comes ONLY from RESEND_FROM_EMAIL, which must be a Work.WitUS address on a domain
// verified in Resend. There is deliberately no hardcoded fallback address: the old fallback was a
// CentenarianOS address, and the apps no longer share a database or an identity, so email from
// Work.WitUS must never appear to come from CentenarianOS. Guessing a Work.WitUS address instead
// would assert a value Resend owns (authoritative-values rule).
//
// When RESEND_FROM_EMAIL is unset this returns null, logs once per process, and every caller skips
// the send rather than failing the request. The in-app record (message, reply, feedback) is still
// saved; only the email notification is dropped.
//
// Pure: no imports, so the Node test runner can load it directly.

let warned = false;

type Env = Record<string, string | undefined>;
type Logger = (message: string) => void;

/**
 * The verified Work.WitUS sender address, or null when RESEND_FROM_EMAIL is not configured.
 * `env` and `log` are injectable for tests; production callers pass nothing.
 */
export function getSenderEmail(env: Env = process.env, log: Logger = console.warn): string | null {
  const value = env.RESEND_FROM_EMAIL?.trim();
  if (value) return value;
  if (!warned) {
    warned = true;
    log(
      '[email] RESEND_FROM_EMAIL is not set. Skipping outgoing email. ' +
        'Set it to a Work.WitUS address on a domain verified in Resend.',
    );
  }
  return null;
}

/** Test-only: reset the log-once latch. */
export function resetSenderWarningForTests(): void {
  warned = false;
}
