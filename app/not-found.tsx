// app/not-found.tsx
// Custom 404 page shown for any unmatched route

import Link from 'next/link';
import { HardHat } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <HardHat size={40} className="text-amber-400 mx-auto mb-4" aria-hidden="true" />

        {/* Number */}
        <p className="text-8xl font-bold text-neutral-800 select-none">404</p>

        {/* Message */}
        <h1 className="mt-2 text-2xl font-bold text-neutral-100">Page not found</h1>
        <p className="mt-3 text-neutral-400 text-sm">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-500 transition min-h-11"
          >
            Back to Home
          </Link>
          <Link
            href="/dashboard/contractor"
            className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 border border-neutral-700 text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-800 transition min-h-11"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/blog"
            className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 border border-neutral-700 text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-800 transition min-h-11"
          >
            Browse Blog
          </Link>
        </div>
      </div>
    </div>
  );
}
