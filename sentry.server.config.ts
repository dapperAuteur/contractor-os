// File: sentry.server.config.ts
// Server-runtime Sentry init, loaded by register() in instrumentation.ts on the Node runtime.
//
// GUARDED ON THE DSN: with no SENTRY_DSN set, init is skipped entirely and the SDK is inert, so the
// app ships and runs unchanged until the Better Stack / Sentry project is provisioned and the var
// is set (see plans/user-tasks/08-provision-betterstack-sentry-dsn.md).

import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@/lib/sentry-scrub';

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Errors only: no performance/tracing spend until it is explicitly wanted.
    tracesSampleRate: 0,
    // Never auto-attach IP / cookies / user email. The beforeSend scrub is the second line of
    // defense, and the one that also covers union documents, invites and job-record bodies.
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}
