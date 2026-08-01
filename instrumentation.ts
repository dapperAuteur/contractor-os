// File: instrumentation.ts
// Next.js instrumentation hook. Loads the right Sentry config per runtime and reports server-side
// App Router errors. Everything here is inert without SENTRY_DSN (the guard lives in the configs),
// so the app builds, deploys and runs exactly as before until the DSN is provisioned.

import * as Sentry from '@sentry/nextjs';
import type { Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config');
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config');
}

// Captures errors thrown while rendering or serving a request (route handlers, server components,
// server actions). The scrub in lib/sentry-scrub.ts runs on the way out, so the request URL, body
// and headers this carries are stripped of contractor data before anything is sent.
export const onRequestError: Instrumentation.onRequestError = Sentry.captureRequestError;
