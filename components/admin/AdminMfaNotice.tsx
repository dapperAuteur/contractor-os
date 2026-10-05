// components/admin/AdminMfaNotice.tsx
// Shown at the top of every /admin page when the admin APIs refuse this session for lack of
// two-factor sign-in (lib/auth/require-admin.ts answers 403 with code 'mfa_required').

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function AdminMfaNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/session')
      .then(async (res) => {
        if (res.ok || cancelled) return;
        const body = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
        if (body?.code === 'mfa_required' && !cancelled) {
          setMessage(body.error ?? 'Admin actions need two-factor sign-in.');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="m-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center"
    >
      <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
      <p className="flex-1">{message}</p>
      <Link
        href="/dashboard/settings"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-500"
      >
        Open Settings
      </Link>
    </div>
  );
}
