/* eslint-disable @typescript-eslint/no-explicit-any */
// app/reset-password/page.tsx
// Handles the password reset form after the user clicks their email link.
// The auth callback exchanges the code and sets the session before landing here.

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HardHat } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const pwChecks = {
    length: password.length >= 10,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const pwValid = Object.values(pwChecks).every(Boolean);
  const matches = password === confirm && confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pwValid) {
      setError('Password must be at least 10 characters with uppercase, lowercase, digit, and symbol.');
      return;
    }
    if (!matches) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => router.push('/dashboard/contractor'), 2500);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <nav className="border-b border-neutral-800 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <HardHat size={24} className="text-amber-400" aria-hidden="true" />
            <span className="text-lg font-bold">Work.WitUS</span>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl p-8 border border-neutral-800 bg-neutral-900">
          {done ? (
            <>
              <h1 className="text-2xl font-bold text-neutral-100 mb-3">Password updated!</h1>
              <p className="text-neutral-400 text-sm">Taking you to your dashboard…</p>
            </>
          ) : (
            <>
              <header className="mb-6">
                <h1 className="text-2xl font-bold text-neutral-100">Set a new password</h1>
                <p className="text-neutral-400 mt-2">Choose a strong password for your account.</p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded-lg text-sm" role="alert">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1 text-neutral-300">
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent border-neutral-700 bg-neutral-800 text-neutral-100 focus:ring-amber-500"
                    placeholder="••••••••••"
                    autoComplete="new-password"
                  />
                  {password.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs">
                      {([
                        ['length', '10+ characters'],
                        ['upper', 'Uppercase letter'],
                        ['lower', 'Lowercase letter'],
                        ['digit', 'Number'],
                        ['symbol', 'Symbol (!@#$…)'],
                      ] as const).map(([key, label]) => (
                        <li key={key} className={pwChecks[key] ? 'text-green-400' : 'text-red-400'}>
                          {pwChecks[key] ? '✓' : '✗'} {label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium mb-1 text-neutral-300">
                    Confirm new password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent border-neutral-700 bg-neutral-800 text-neutral-100 focus:ring-amber-500"
                    placeholder="••••••••••"
                    autoComplete="new-password"
                  />
                  {confirm.length > 0 && (
                    <p className={`text-xs mt-1 ${matches ? 'text-green-400' : 'text-red-400'}`}>
                      {matches ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !pwValid || !matches}
                  className="w-full py-3 rounded-lg font-semibold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition min-h-11"
                >
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-neutral-800 px-4 py-8 text-center text-xs text-neutral-500">
        <p>&copy; {new Date().getFullYear()} Work.WitUS. All rights reserved.</p>
      </footer>
    </div>
  );
}
