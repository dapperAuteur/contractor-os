/* eslint-disable @typescript-eslint/no-explicit-any */
// app/forgot-password/page.tsx
// Sends a password reset email via Supabase.

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { HardHat } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?type=recovery&next=${encodeURIComponent('/reset-password')}`
        : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <HardHat size={24} className="text-amber-600" aria-hidden="true" />
            <span className="text-lg font-bold">Work.WitUS</span>
          </Link>
          <Link href="/login" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 min-h-11 flex items-center">
            Log In
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl p-8 border border-slate-200 bg-white">
          {sent ? (
            <>
              <header className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
                <p className="text-slate-500 mt-2">
                  We sent a password reset link to <span className="text-slate-900 font-medium">{email}</span>.
                </p>
              </header>
              <p className="text-sm text-slate-400 mb-6">
                The link expires in 1 hour. If you don&apos;t see it, check your spam folder.
              </p>
              <Link
                href="/login"
                className="block w-full text-center py-3 rounded-lg font-semibold bg-amber-600 hover:bg-amber-500 text-white transition min-h-11"
              >
                Back to Login
              </Link>
            </>
          ) : (
            <>
              <header className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
                <p className="text-slate-500 mt-2">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm" role="alert">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1 text-slate-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition min-h-11"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>

                <p className="text-center text-sm text-slate-500">
                  Remembered it?{' '}
                  <Link href="/login" className="font-medium text-amber-600 hover:underline">
                    Back to Login
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} Work.WitUS. All rights reserved.</p>
      </footer>
    </div>
  );
}
