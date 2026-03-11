/* eslint-disable @typescript-eslint/no-explicit-any */
// File: app/signup/page.tsx
// New user registration with Cloudflare Turnstile bot prevention.

'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { HardHat } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pwChecks = {
    length: password.length >= 10,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const pwValid = Object.values(pwChecks).every(Boolean);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const widgetIdRef = useRef<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Render Turnstile widget once the script loads
  function onTurnstileLoad() {
    if (!window.turnstile || !siteKey) return;
    widgetIdRef.current = window.turnstile.render('#turnstile-widget', {
      sitekey: siteKey,
      callback: (token: string) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(null),
      'error-callback': () => setTurnstileToken(null),
      theme: 'dark',
    });
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Use and Privacy Policy to continue.');
      return;
    }

    if (!pwValid) {
      setError('Password must be at least 10 characters with uppercase, lowercase, digit, and symbol.');
      return;
    }

    // Skip Turnstile if no site key configured (dev environment)
    if (siteKey) {
      if (!turnstileToken) {
        setError('Please complete the human verification below.');
        return;
      }

      setLoading(true);
      try {
        const verifyRes = await fetch('/api/auth/verify-turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          setError(verifyData.error ?? 'Verification failed. Please try again.');
          // Reset widget so user can retry
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
          setTurnstileToken(null);
          setLoading(false);
          return;
        }
      } catch {
        setError('Could not verify. Please refresh and try again.');
        setLoading(false);
        return;
      }
    } else {
      setLoading(true);
    }

    try {
      const dashboardRedirect = '/dashboard/contractor';
      const emailRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(dashboardRedirect)}`
        : undefined;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (error) throw error;

      router.push('/pricing?from=signup');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {siteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
          onLoad={onTurnstileLoad}
        />
      )}

      <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 dark-input">
        {/* Header */}
        <nav className="border-b border-neutral-800 px-4 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <HardHat size={24} className="text-amber-400" aria-hidden="true" />
              <span className="text-lg font-bold">JobHub</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/pricing" className="text-sm text-neutral-400 hover:text-neutral-200">Pricing</Link>
              <Link href="/login" className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 min-h-11 flex items-center">
                Log In
              </Link>
            </div>
          </div>
        </nav>

        {/* Signup Form */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl p-8 border border-neutral-800 bg-neutral-900">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-neutral-100">Create your account</h1>
              <p className="text-neutral-400 mt-2">Get started with JobHub</p>
            </header>

            <form onSubmit={handleSignup} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm" role="alert">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1 text-neutral-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent border-neutral-700 bg-neutral-800 text-neutral-100 focus:ring-amber-500"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1 text-neutral-300">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={10}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent border-neutral-700 bg-neutral-800 text-neutral-100 focus:ring-amber-500"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {password.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs" id="password-hint">
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
                {password.length === 0 && (
                  <p className="text-xs mt-1 text-neutral-500" id="password-hint">Minimum 10 characters with upper, lower, digit, and symbol</p>
                )}
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded shrink-0 border-neutral-600 bg-neutral-800 focus:ring-amber-500"
                />
                <label htmlFor="agree-terms" className="text-sm cursor-pointer text-neutral-400">
                  I agree to the{' '}
                  <Link href="/terms" className="font-medium text-amber-400 hover:underline" target="_blank">
                    Terms of Use
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="font-medium text-amber-400 hover:underline" target="_blank">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Cloudflare Turnstile widget — only rendered when site key is configured */}
              {siteKey && (
                <div id="turnstile-widget" className="flex justify-center" />
              )}

              <button
                type="submit"
                disabled={loading || !agreedToTerms || !pwValid || (!!siteKey && !turnstileToken)}
                className="w-full text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 bg-amber-600 hover:bg-amber-500 min-h-11"
              >
                {loading ? 'Creating account…' : 'Sign up'}
              </button>

              <p className="text-center text-sm text-neutral-400">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-amber-400 hover:underline">
                  Login
                </Link>
              </p>
            </form>
          </div>
        </main>

        <footer className="border-t border-neutral-800 px-4 py-8 text-center text-xs text-neutral-500">
          <p>&copy; {new Date().getFullYear()} JobHub. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
