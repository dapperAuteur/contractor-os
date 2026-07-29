'use client';

// File: app/global-error.tsx
// Root error boundary — catches errors thrown in the root layout itself, which no other boundary
// can see. It renders its own <html>/<body> (the root layout is gone at this point), so the styles
// are inline: globals.css is not applied here.
//
// It is also the only place a root-layout render crash reaches Sentry: React swallows it into the
// boundary, so window.onerror never fires. Sentry.captureException is a no-op without a DSN.

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          background: '#0a0a0a',
          color: '#f5f5f5',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
        }}
      >
        <main style={{ maxWidth: 480, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#a3a3a3', marginTop: 12 }}>
            We could not load this page. Your saved work is safe. Please try again in a moment.
          </p>
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: 44,
                padding: '0 20px',
                borderRadius: 8,
                border: 'none',
                background: '#d97706',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            {/* The root boundary renders outside the router, so a plain anchor is correct here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                minHeight: 44,
                padding: '11px 20px',
                borderRadius: 8,
                border: '1px solid #404040',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              Back to home
            </a>
          </div>
          {error.digest ? (
            <p style={{ color: '#737373', fontSize: 12, marginTop: 16 }}>Reference: {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
