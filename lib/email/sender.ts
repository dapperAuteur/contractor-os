// File: lib/email/sender.ts
// The one place that decides which address Work.WitUS sends email from.
//
// The sender comes ONLY from EMAIL_FROM, which must be a Work.WitUS address on the domain verified
// in Mailgun (MAILGUN_DOMAIN). There is deliberately no hardcoded fallback address: the old
// fallback was a CentenarianOS address, and guessing a Work.WitUS address instead would assert a
// value Mailgun owns (authoritative-values rule). RESEND_FROM_EMAIL is no longer read.
//
// When EMAIL_FROM is unset this returns null, logs once per process, and the send is skipped
// (lib/email/mailgun.ts returns `not_configured`). The in-app record is still saved.
//
// Pure: no imports, so the Node test runner can load it directly.

let warned = false;

type Env = Record<string, string | undefined>;
type Logger = (message: string) => void;

/**
 * The verified Work.WitUS sender address, or null when EMAIL_FROM is not configured.
 * `env` and `log` are injectable for tests; production callers pass nothing.
 */
export function getSenderEmail(env: Env = process.env, log: Logger = console.warn): string | null {
  const value = env.EMAIL_FROM?.trim();
  if (value) return value;
  if (!warned) {
    warned = true;
    log(
      '[email] EMAIL_FROM is not set. Skipping outgoing email. ' +
        'Set it to a Work.WitUS address on the domain verified in Mailgun.',
    );
  }
  return null;
}

/** Test-only: reset the log-once latch. */
export function resetSenderWarningForTests(): void {
  warned = false;
}
