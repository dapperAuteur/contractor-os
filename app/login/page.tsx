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
import WitusSsoButton from '@/components/login/WitusSsoButton';
import { getAalAndFactors, needsMfaVerification } from '@/lib/mfa/helpers';
import { capture } from '@/lib/analytics/capture';
import { EVENTS } from '@/lib/analytics/events';

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

  // `?mfa=pending` means we arrived here ALREADY AUTHENTICATED and owing a second factor — the
  // middleware sent us (lib/auth/route-guard.ts), and the WitUS OIDC callback is one of the doors
  // that can trigger it, exactly like a password login. Hold the credential form back while the
  // check runs: showing "Welcome back, enter your password" to someone who has already passed that
  // step, for the half second before it flips to the code field, reads as a failed login.
  const mfaPendingParam = searchParams.get('mfa') === 'pending';
  const [mfaChecking, setMfaChecking] = useState(mfaPendingParam);

  // A failed WitUS sign-in bounces back here with ?error=witus_*. Say SOMETHING: the alternative is
  // a visitor who clicks the button, watches the page reload unchanged, and concludes the app is
  // broken. The specific code is deliberately not spelled out in prose — it is in the URL for BAM
  // and for a support conversation, and it names internal flow stages ("witus_token") that mean
  // nothing to a contractor.
  const ssoError = searchParams.get('error');
  const ssoErrorMessage = ssoError?.startsWith('witus_')
    ? ssoError === 'witus_not_configured'
      ? 'Sign in with WitUS is not available right now. Use your email and password below.'
      : 'We could not finish signing you in with WitUS. Try again, or use your email and password below.'
    : null;

  const dashboardRedirect = '/dashboard/contractor';

  // Handle middleware redirect with ?mfa=pending
  useEffect(() => {
    if (searchParams.get('mfa') !== 'pending') {
      setMfaChecking(false);
      return;
    }
    let live = true;
    async function checkMfa() {
      try {
        const { currentLevel, nextLevel, hasMfaEnabled } = await getAalAndFactors(supabase);
        if (live && hasMfaEnabled && needsMfaVerification(currentLevel, nextLevel)) {
          setMfaRequired(true);
        }
      } finally {
        if (live) setMfaChecking(false);
      }
    }
    checkMfa();
    return () => {
      live = false;
    };
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
    // Shared ecosystem sign-in funnel. `method` distinguishes the two tabs; nothing
    // identifying goes with it. Never send the Supabase error text: it is vendor copy
    // that can echo the submitted address, and capture here is anonymous by design.
    capture(EVENTS.signinStarted, { method: 'password' });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Check if MFA verification is needed
      const { currentLevel, nextLevel } = await getAalAndFactors(supabase);
      if (needsMfaVerification(currentLevel, nextLevel)) {
        // Credentials were accepted, so the sign-in step succeeded; MFA is a separate
        // step the user has not passed yet. Flagged rather than treated as a second
        // funnel so the shared signin_* ratio means the same thing in every app.
        capture(EVENTS.signinSucceeded, { method: 'password', mfaRequired: true });
        setMfaRequired(true);
        return;
      }
      capture(EVENTS.signinSucceeded, { method: 'password', mfaRequired: false });
      router.push(dashboardRedirect);
      router.refresh();
    } catch (err: any) {
      capture(EVENTS.signinFailed, { method: 'password', stage: 'credentials' });
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
    // The OTP flow starts here, not at verify: requesting the code is where the user
    // enters the funnel, and the gap between this and signin_succeeded is exactly the
    // drop-off (never got the mail, gave up on the code) worth being able to see.
    capture(EVENTS.signinStarted, { method: 'otp' });
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
      capture(EVENTS.signinFailed, { method: 'otp', stage: 'send_code' });
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
        capture(EVENTS.signinSucceeded, { method: 'otp', mfaRequired: true });
        setMfaRequired(true);
        return;
      }
      capture(EVENTS.signinSucceeded, { method: 'otp', mfaRequired: false });
      router.push(dashboardRedirect);
      router.refresh();
    } catch (err: any) {
      capture(EVENTS.signinFailed, { method: 'otp', stage: 'verify_code' });
      setOtpError(err.message ?? 'Invalid code');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <nav className="border-b border-slate-200 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <HardHat size={24} className="text-amber-600" aria-hidden="true" />
            <span className="text-lg font-bold">Work.WitUS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-slate-500 hover:text-slate-900">Pricing</Link>
            <Link href="/signup" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 min-h-11 flex items-center">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl p-8 border border-slate-200 bg-white">
          {mfaChecking ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3" role="status">
              <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" />
              <p className="text-sm text-slate-500">Checking your sign-in...</p>
            </div>
          ) : mfaRequired ? (
            <>
              <header className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
                <p className="text-slate-500 mt-2">Verify your identity to continue</p>
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
            <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-slate-500 mt-2">Log in to Work.WitUS</p>
          </header>

          {ssoErrorMessage && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm mb-6" role="alert">
              {ssoErrorMessage}
            </div>
          )}

          {/* Tabs */}
          <div className="flex mb-6 border rounded-lg overflow-hidden border-slate-200">
            <button
              type="button"
              onClick={() => switchTab('password')}
              className={`flex-1 py-2 text-sm font-medium transition ${
                tab === 'password'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
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
                  : 'text-slate-500 hover:bg-slate-100'
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
                <label htmlFor="email" className="block text-sm font-medium mb-1 text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-amber-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
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

              <p className="text-center text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="font-medium text-amber-600 hover:underline">
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
                    <label htmlFor="otp-email" className="block text-sm font-medium mb-1 text-slate-700">
                      Email
                    </label>
                    <input
                      id="otp-email"
                      type="email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      placeholder="you@example.com"
                    />
                    <p className="text-xs mt-1.5 text-slate-400">
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
                    <p className="text-sm mb-4 text-slate-500">
                      Check your email at <span className="font-medium text-slate-900">{otpEmail}</span>. You&apos;ll receive either a login link (click to sign in) or a 6-digit code to enter below.
                    </p>
                    <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 mb-4 text-xs text-slate-500">
                      <p>
                        Your login link will come from{' '}
                        <span className="font-medium text-amber-600">CentenarianOS.com</span>
                        {' '}&mdash;{' '}
                        <span className="text-slate-700">Work.WitUS</span> and CentenarianOS share a unified account system powered by{' '}
                        <a href="https://WitUS.Online" target="_blank" rel="noopener noreferrer" className="font-medium text-amber-600 hover:underline">WitUS.online</a>.
                      </p>
                    </div>
                    <label htmlFor="otp-code" className="block text-sm font-medium mb-1 text-slate-700">
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-center text-2xl tracking-widest font-mono"
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
                    className="w-full text-sm transition text-slate-400 hover:text-slate-700"
                  >
                    Use a different email
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── Sign in with WitUS (ecosystem SSO) ──────────────────────
              Renders "Sign in with WitUS", and in parallel asks the IdP whether this browser
              already has a WitUS session — if so the label becomes "Continue as <name>". A blocked
              or timed-out check changes nothing. Renders null entirely when this app is not a
              configured OIDC client, and on www.badcba.com, the other host this one deployment
              serves, which the IdP does not know.

              `signedIn`: the middleware bounces an authenticated visitor off /login, so the only
              way to be here WITH a local session is ?mfa=pending — its one exemption. Skip the
              probe in that case: the visitor is signed in already and just owes a second factor. */}
          <WitusSsoButton signedIn={mfaPendingParam} />
          </>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} Work.WitUS. All rights reserved.</p>
        <p className="mt-1">Powered by <a href="https://WitUS.Online" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">WitUS.Online</a>, a B4C LLC brand</p>
      </footer>
    </div>
  );
}
