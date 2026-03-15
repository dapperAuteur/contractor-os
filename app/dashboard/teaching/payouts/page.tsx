'use client';

// app/dashboard/teaching/payouts/page.tsx
// Stripe Connect onboarding + payout status for teachers.

import { useEffect, useState } from 'react';
import { offlineFetch } from '@/lib/offline/offline-fetch';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CreditCard, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

function PayoutsContent() {
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected') === 'true';
  const refresh = searchParams.get('refresh') === 'true';

  const [status, setStatus] = useState<{ connected: boolean; onboarded: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    offlineFetch('/api/teacher/connect')
      .then((r) => r.json())
      .then((d) => { setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [connected]);

  async function handleConnect() {
    setRedirecting(true);
    setError('');
    try {
      const r = await offlineFetch('/api/teacher/connect', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Failed');
      window.location.href = d.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start onboarding');
      setRedirecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-1">Payouts</h1>
      <p className="text-slate-500 text-sm mb-8">
        Connect a bank account via Stripe to receive payments from course enrollments.
      </p>

      {refresh && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 mb-6 text-amber-300 text-sm">
          Onboarding was not completed. Please try again to finish setting up your payout account.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            status?.onboarded ? 'bg-green-900/30' : 'bg-slate-100'
          }`}>
            {status?.onboarded
              ? <CheckCircle className="w-5 h-5 text-green-400" />
              : <CreditCard className="w-5 h-5 text-slate-500" />
            }
          </div>
          <div>
            <p className="font-semibold text-white">
              {status?.onboarded ? 'Stripe Connected' : 'Not Connected'}
            </p>
            <p className="text-slate-400 text-sm">
              {status?.onboarded
                ? 'Your bank account is set up to receive payouts.'
                : 'You need to connect your Stripe account to get paid.'}
            </p>
          </div>
        </div>

        {!status?.onboarded && (
          <>
            <p className="text-slate-500 text-sm mb-4">
              Work.WitUS uses Stripe Connect to send your earnings directly to your bank account.
              You keep the majority of each course sale; a small platform fee covers payment processing.
            </p>
            <button
              type="button"
              onClick={handleConnect}
              disabled={redirecting}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-500 transition disabled:opacity-50"
            >
              {redirecting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
                : <>{status?.connected ? 'Continue Onboarding' : 'Connect Bank Account'} <ArrowRight className="w-4 h-4" /></>
              }
            </button>
            {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
          </>
        )}

        {status?.onboarded && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Payout status</span>
              <span className="text-green-400 font-medium">Active</span>
            </div>
            <button
              type="button"
              onClick={handleConnect}
              disabled={redirecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-100 transition disabled:opacity-50"
            >
              {redirecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Manage Stripe Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>}>
      <PayoutsContent />
    </Suspense>
  );
}
