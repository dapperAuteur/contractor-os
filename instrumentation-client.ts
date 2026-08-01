// File: instrumentation-client.ts
// Browser-runtime Sentry init. Reads the PUBLIC DSN (inlined at build time). Guarded: with no
// NEXT_PUBLIC_SENTRY_DSN the SDK is never initialised, so nothing is sent and nothing changes for
// contractors in the field.

import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@/lib/sentry-scrub';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    // Errors only. No tracing and no session replay: a replay of this app would record union
    // documents, job sites and client contact details, which is exactly what we refuse to send.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}

// Instruments App Router client navigations for Sentry (a no-op when the SDK is not initialised).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
