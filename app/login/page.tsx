/* eslint-disable @typescript-eslint/no-explicit-any */
// File: app/login/page.tsx
// User authentication — password login or email OTP (6-digit code).

'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { HardHat } from 'lucide-react';
import MfaVerifyStep from '@/components/login/MfaVerifyStep';
import { getAalAndFactors, needsMfaVerification } from '@/lib/mfa/helpers';

type LoginTab = 'password' | 'otp';
type OtpStep = 'email' | 'code';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [tab, setTab] = useState<LoginTab>('password');

  // Password tab state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP tab state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const [mfaRequired, setMfaRequired] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const dashboardRedirect = '/dashboard/contractor';

  // Handle middleware redirect with ?mfa=pending
  useEffect(() => {
    if (searchParams.get('mfa') !== 'pending') return;
    async function checkMfa() {
      const { currentLevel, nextLevel, hasMfaEnabled } = await getAalAndFactors(supabase);
      if (hasMfaEnabled && needsMfaVerification(currentLevel, nextLevel)) {
        setMfaRequired(true);
      }
    }
    checkMfa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function switchTab(t: LoginTab) {
    setTab(t);
    setError('');
    setOtpError('');
    setOtpStep('email');
  }

  // ── Password login ──────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Check if MFA verification is needed
      const { currentLevel, nextLevel } = await getAalAndFactors(supabase);
      if (needsMfaVerification(currentLevel, nextLevel)) {
        setMfaRequired(true);
        return;
      }
      router.push(dashboardRedirect);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── OTP: send code / magic link ─────────────────────────────────────────
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      let emailRedirectTo: string | undefined;
      if (typeof window !== 'undefined') {
        emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(dashboardRedirect)}`;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: otpEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo,
        },
      });
      if (error) throw error;
      setOtpStep('code');
    } catch (err: any) {
      setOtpError(err.message ?? 'Failed to send code');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── OTP: verify code ────────────────────────────────────────────────────
  const handleVerifyCode = async (e: React.FormEvent) => {
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
      // Check if MFA verification is needed
      const { currentLevel, nextLevel } = await getAalAndFactors(supabase);
      if (needsMfaVerification(currentLevel, nextLevel)) {
        setMfaRequired(true);
        return;
      }
      router.push(dashboardRedirect);
      router.refresh();
    } catch (err: any) {
      setOtpError(err.message ?? 'Invalid code');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
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
            <Link href="/signup" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 min-h-11 flex items-center">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl p-8 border border-neutral-800 bg-neutral-900">
          {mfaRequired ? (
            <>
              <header className="mb-6">
                <h1 className="text-3xl font-bold text-neutral-100">Welcome back</h1>
                <p className="text-neutral-400 mt-2">Verify your identity to continue</p>
              </header>
              <MfaVerifyStep
                onVerified={() => {
                  router.push(dashboardRedirect);
                  router.refresh();
                }}
                onCancel={async () => {
                  await supabase.auth.signOut();
                  setMfaRequired(false);
                }}
              />
            </>
          ) : (
          <>
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-neutral-100">Welcome back</h1>
            <p className="text-neutral-400 mt-2">Log in to Work.WitUS</p>
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
              Email Link
            </button>
          </div>

          {/* ── Password tab ──────────────────────────────────────────── */}
          {tab === 'password' && (
            <form onSubmit={handleLogin} className="space-y-6">
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
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-amber-400 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent border-neutral-700 bg-neutral-800 text-neutral-100 focus:ring-amber-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 bg-amber-600 hover:bg-amber-500 min-h-11"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <p className="text-center text-sm text-neutral-400">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="font-medium text-amber-400 hover:underline">
                  Sign up
                </Link>
              </p>
            </form>
          )}

          {/* ── Email Code tab ──────────────────────────────────────── */}
          {tab === 'otp' && (
            <div className="space-y-6">
              {otpError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm" role="alert">
                  {otpError}
                </div>
              )}

              {otpStep === 'email' ? (
                <form onSubmit={handleSendCode} className="space-y-6">
                  <div>
                    <label htmlFor="otp-email" className="block text-sm font-medium mb-1 text-neutral-300">
                      Email
                    </label>
                    <input
                      id="otp-email"
                      type="email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent border-neutral-700 bg-neutral-800 text-neutral-100 focus:ring-amber-500"
                      placeholder="you@example.com"
                    />
                    <p className="text-xs mt-1.5 text-neutral-500">
                      We&apos;ll send a login link or 6-digit code to this address. Only existing accounts can use this method.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 bg-amber-600 hover:bg-amber-500 min-h-11"
                  >
                    {otpLoading ? 'Sending...' : 'Send Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-6">
                  <div>
                    <p className="text-sm mb-4 text-neutral-400">
                      Check your email at <span className="font-medium text-neutral-100">{otpEmail}</span>. You&apos;ll receive either a login link (click to sign in) or a 6-digit code to enter below.
                    </p>
                    <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-3 mb-4 text-xs text-neutral-400">
                      <p>
                        Your login link will come from{' '}
                        <span className="font-medium text-amber-400">CentenarianOS.com</span>
                        {' '}&mdash;{' '}
                        <span className="text-neutral-300">Work.WitUS</span> and CentenarianOS share a unified account system powered by{' '}
                        <a href="https://WitUS.Online" target="_blank" rel="noopener noreferrer" className="font-medium text-amber-400 hover:underline">WitUS.online</a>.
                      </p>
                    </div>
                    <label htmlFor="otp-code" className="block text-sm font-medium mb-1 text-neutral-300">
                      6-digit code
                    </label>
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
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent form-input text-center text-2xl tracking-widest font-mono border-neutral-700 bg-neutral-800 text-neutral-100 focus:ring-amber-500"
                      placeholder="000000"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading || otpCode.length !== 6}
                    className="w-full text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 bg-amber-600 hover:bg-amber-500 min-h-11"
                  >
                    {otpLoading ? 'Verifying...' : 'Verify & Login'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setOtpStep('email'); setOtpCode(''); setOtpError(''); }}
                    className="w-full text-sm transition text-neutral-500 hover:text-neutral-300"
                  >
                    Use a different email
                  </button>
                </form>
              )}
            </div>
          )}
          </>
          )}
        </div>
      </main>

      <footer className="border-t border-neutral-800 px-4 py-8 text-center text-xs text-neutral-500">
        <p>&copy; {new Date().getFullYear()} Work.WitUS. All rights reserved.</p>
        <p className="mt-1">Powered by <a href="https://WitUS.Online" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">WitUS.Online</a>, a B4C LLC brand</p>
      </footer>
    </div>
  );
}
