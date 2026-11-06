'use client';

// app/error.tsx
// Root route error boundary. Shows no error text to the visitor; the digest is an opaque id the
// server logs carry, safe to show for support.

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/ui/SiteFooter';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function ErrorContent({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-[60vh] bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-3 text-slate-600 text-sm">
          This page hit an unexpected error. Try again, or head home. Most pages still work.
        </p>
        {error.digest ? (
          <p className="mt-4 text-xs text-slate-500 font-mono">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="w-full sm:w-auto min-h-11 flex items-center justify-center px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-500 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto min-h-11 flex items-center justify-center px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Error pages keep the app shell (witus docs/shared-ui-ux-dx.md): the root layout renders no
// header, so the error boundary renders the public header (with its sign-in link) and the footer.
export default function RouteError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <ErrorContent {...props} />
      </main>
      <SiteFooter />
    </div>
  );
}
