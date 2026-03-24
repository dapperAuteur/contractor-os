'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HardHat, Check, ArrowRight, Loader2 } from 'lucide-react';

const FEATURES = [
  'Unlimited jobs, time entries, and invoices',
  'Rate cards with quick-apply to new jobs',
  'Rate comparison — earnings across clients and venues',
  'Earnings reports, 1099 tracking, and tax exports',
  'Contractor board for peer-to-peer coverage',
  'Venue knowledge base (parking, WiFi, load-in, power)',
  'City guides with community-shared recommendations',
  'Union hub — memberships, dues, and document tracking',
  'Multi-account finance tracking with budgets',
  'Document scanner — receipts, pay stubs, call sheets (AI)',
  'Equipment inventory with valuation and depreciation',
  'Travel and mileage logging with fuel tracking',
  'Offline-capable PWA — works without internet',
  'Mobile-first responsive design',
];

export default function ContractorPricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(plan: 'contractor-monthly' | 'contractor-annual') {
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/signup';
          return;
        }
        setError(data.error ?? 'Something went wrong');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Nav */}
      <nav className="border-b border-slate-200 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <HardHat size={24} className="text-amber-600" aria-hidden="true" />
            <span className="text-lg font-bold">Work.WitUS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 min-h-11 flex items-center">
              Log In
            </Link>
            <Link href="/signup" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 min-h-11 flex items-center">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">Simple Pricing</h1>
        <p className="mt-3 text-center text-slate-500">Everything included. No feature gating. No surprises.</p>

        {error && (
          <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {/* Monthly */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-800">Monthly</h2>
            <div className="mt-3">
              <span className="text-4xl font-extrabold text-amber-600">$10</span>
              <span className="text-slate-400">/month</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">Cancel anytime. No commitment.</p>
            <button
              onClick={() => handleCheckout('contractor-monthly')}
              disabled={loading !== null}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 text-base font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11"
            >
              {loading === 'contractor-monthly' ? (
                <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Processing…</>
              ) : (
                <>Subscribe <ArrowRight size={16} aria-hidden="true" /></>
              )}
            </button>
          </div>

          {/* Annual */}
          <div className="rounded-2xl border-2 border-amber-600 bg-white p-6 relative">
            <span className="absolute -top-3 left-4 rounded-full bg-amber-600 px-3 py-0.5 text-xs font-bold text-white">
              Save $20
            </span>
            <h2 className="text-lg font-semibold text-slate-800">Annual</h2>
            <div className="mt-3">
              <span className="text-4xl font-extrabold text-amber-600">$100</span>
              <span className="text-slate-400">/year</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">$8.33/month, billed annually.</p>
            <button
              onClick={() => handleCheckout('contractor-annual')}
              disabled={loading !== null}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 text-base font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11"
            >
              {loading === 'contractor-annual' ? (
                <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Processing…</>
              ) : (
                <>Subscribe <ArrowRight size={16} aria-hidden="true" /></>
              )}
            </button>
          </div>
        </div>

        {/* Feature list */}
        <div className="mt-16">
          <h2 className="text-xl font-bold text-center mb-6">Everything Included</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-2 py-1">
                <Check size={16} className="mt-0.5 text-amber-600 shrink-0" aria-hidden="true" />
                <span className="text-sm text-slate-700">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 space-y-4">
          <h2 className="text-xl font-bold text-center mb-6">FAQ</h2>
          {[
            { q: 'Is there a free plan?', a: 'No. We offer a focused paid product with no feature limits. Sign up and subscribe to get started.' },
            { q: 'Can I cancel anytime?', a: 'Yes. Monthly plans cancel immediately. Annual plans run through the billing period.' },
            { q: 'Do I need another subscription?', a: 'No. Work.WitUS is a standalone product. You can subscribe to it independently.' },
            { q: 'What payment methods are accepted?', a: 'All major credit cards via Stripe. Secure checkout with no card data stored on our servers.' },
            { q: 'Is my data private?', a: 'Yes. Row-level security ensures your data is isolated. Shared features (job board, city guides, union docs) are opt-in only.' },
            { q: 'How do I get help if I have a problem?', a: 'Customer support is managed by a real human — not AI. Reach out through the in-app feedback form or email and a team member will respond personally.' },
          ].map((faq) => (
            <details key={faq.q} className="rounded-xl border border-slate-200 bg-white p-4 group">
              <summary className="cursor-pointer font-medium text-slate-800 text-sm">{faq.q}</summary>
              <p className="mt-2 text-sm text-slate-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} Work.WitUS. All rights reserved.</p>
        <p className="mt-1">Powered by <a href="https://WitUS.Online" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">WitUS.Online</a>, a B4C LLC brand</p>
      </footer>
    </div>
  );
}
