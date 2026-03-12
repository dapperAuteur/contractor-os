/* eslint-disable @typescript-eslint/no-explicit-any */
// File: app/signup/page.tsx
// New user registration — password or email OTP (no password required).

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

type SignupTab = 'password' | 'otp';
type OtpStep = 'email' | 'code';

export default function SignupPage() {
  const [tab, setTab] = useState<SignupTab>('password');

  // Password tab
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  // OTP tab
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpAgreed, setOtpAgreed] = useState(false);

  const pwChecks = {
    length: password.length >= 10,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const pwValid = Object.values(pwChecks).every(Boolean);

  const router = useRouter();
  const supabase = createClient();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  function switchTab(t: SignupTab) {
    setTab(t);
    setError('');
    setOtpError('');
    setOtpStep('email');
  }

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

  // ── Password signup ────────────────────────────────────────────────────────
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
    if (siteKey && !turnstileToken) {
      setError('Please complete the human verification below.');
      return;
    }

    setLoading(true);

    if (siteKey) {
      try {
        const verifyRes = await fetch('/api/auth/verify-turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          setError(verifyData.error ?? 'Verification failed. Please try again.');
          if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
          setTurnstileToken(null);
          setLoading(false);
          return;
        }
      } catch {
        setError('Could not verify. Please refresh and try again.');
        setLoading(false);
        return;
      }
    }

    try {
      const emailRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard/contractor')}`
        : undefined;

      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
      if (error) throw error;

      router.push('/pricing?from=signup');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── OTP: send 6-digit code (creates account if new) ───────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    if (!otpAgreed) {
      setOtpError('Please agree to the Terms of Use and Privacy Policy to continue.');
      return;
    }
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: otpEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setOtpStep('code');
    } catch (err: any) {
      setOtpError(err.message ?? 'Failed to send code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── OTP: verify 6-digit code ───────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otpCode,
        type: 'email',
      });
      if (error) throw error;
      router.push('/pricing?from=signup');
      router.refresh();
    } catch (err: any) {
      setOtpError(err.message ?? 'Invalid or expired code. Please try again.');
    } finally {
      setOtpLoading(false);
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
              <span className="text-lg font-bold">Work.WitUS</span>
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
            <header className="mb-6">
              <h1 className="text-3xl font-bold text-neutral-100">Create your account</h1>
              <p className="text-neutral-400 mt-2">Get started with Work.WitUS</p>
            </header>

            {/* Tabs */}
            <div className="flex mb-6 border rounded-lg overflow-hidden border-neutral-700">
              <button
                type="button"
                onClick={() => switchTab('password')}
                className={`flex-1 py-2 text-sm font-medium transition ${
                  tab === 'password'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => switchTab('otp')}
                className={`flex-1 py-2 text-sm font-medium transition ${
                  tab === 'otp'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                Email Code
              </button>
            </div>

            {/* ── Password tab ─────────────────────────────────────────────── */}
            {tab === 'password' && (
              <form onSubmit={handleSignup} className="space-y-5">
                {error && (
                  <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded-lg text-sm" role="alert">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1 text-neutral-300">Email</label>
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
                  <label htmlFor="password" className="block text-sm font-medium mb-1 text-neutral-300">Password</label>
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
                  {password.length > 0 ? (
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
                  ) : (
                    <p className="text-xs mt-1 text-neutral-500">Minimum 10 characters with upper, lower, digit, and symbol</p>
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
                    <Link href="/terms" className="font-medium text-amber-400 hover:underline" target="_blank">Terms of Use</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="font-medium text-amber-400 hover:underline" target="_blank">Privacy Policy</Link>
                  </label>
                </div>

                {siteKey && <div id="turnstile-widget" className="flex justify-center" />}

                <button
                  type="submit"
                  disabled={loading || !agreedToTerms || !pwValid || (!!siteKey && !turnstileToken)}
                  className="w-full text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 bg-amber-600 hover:bg-amber-500 min-h-11"
                >
                  {loading ? 'Creating account…' : 'Sign Up'}
                </button>

                <p className="text-center text-sm text-neutral-400">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-amber-400 hover:underline">Log In</Link>
                </p>
              </form>
            )}

            {/* ── Email OTP tab ─────────────────────────────────────────────── */}
            {tab === 'otp' && (
              <div className="space-y-5">
                {otpError && (
                  <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded-lg text-sm" role="alert">
                    {otpError}
                  </div>
                )}

                {otpStep === 'email' ? (
                  <form onSubmit={handleSendOtp} className="space-y-5">
                    <div>
                      <label htmlFor="otp-email" className="block text-sm font-medium mb-1 text-neutral-300">Email address</label>
                      <input
                        id="otp-email"
                        type="email"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        required
                        autoFocus
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent border-neutral-700 bg-neutral-800 text-neutral-100 focus:ring-amber-500"
                        placeholder="you@example.com"
                      />
                      <p className="text-xs mt-1.5 text-neutral-500">
                        We&apos;ll send a 6-digit code to this address. A new account will be created if you&apos;re new.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        id="otp-agree-terms"
                        type="checkbox"
                        checked={otpAgreed}
                        onChange={(e) => setOtpAgreed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded shrink-0 border-neutral-600 bg-neutral-800 focus:ring-amber-500"
                      />
                      <label htmlFor="otp-agree-terms" className="text-sm cursor-pointer text-neutral-400">
                        I agree to the{' '}
                        <Link href="/terms" className="font-medium text-amber-400 hover:underline" target="_blank">Terms of Use</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="font-medium text-amber-400 hover:underline" target="_blank">Privacy Policy</Link>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading || !otpAgreed}
                      className="w-full text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 bg-amber-600 hover:bg-amber-500 min-h-11"
                    >
                      {otpLoading ? 'Sending…' : 'Send Code'}
                    </button>

                    <p className="text-center text-sm text-neutral-400">
                      Already have an account?{' '}
                      <Link href="/login" className="font-medium text-amber-400 hover:underline">Log In</Link>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <p className="text-sm text-neutral-400">
                      Enter the 6-digit code sent to <span className="font-medium text-neutral-100">{otpEmail}</span>.
                    </p>

                    <div>
                      <label htmlFor="otp-code" className="block text-sm font-medium mb-1 text-neutral-300">6-digit code</label>
                      <input
                        id="otp-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        autoFocus
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent border-neutral-700 bg-neutral-800 text-neutral-100 focus:ring-amber-500 text-center text-2xl tracking-widest font-mono"
                        placeholder="000000"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading || otpCode.length !== 6}
                      className="w-full text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 bg-amber-600 hover:bg-amber-500 min-h-11"
                    >
                      {otpLoading ? 'Verifying…' : 'Verify & Create Account'}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setOtpStep('email'); setOtpCode(''); setOtpError(''); }}
                      className="w-full text-sm text-neutral-500 hover:text-neutral-300 transition"
                    >
                      Use a different email
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </main>

        <footer className="border-t border-neutral-800 px-4 py-8 text-center text-xs text-neutral-500">
          <p>&copy; {new Date().getFullYear()} Work.WitUS. All rights reserved.</p>
          <p className="mt-1">Powered by <a href="https://WitUS.Online" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">WitUS.Online</a>, a B4C LLC brand</p>
        </footer>
      </div>
    </>
  );
}
