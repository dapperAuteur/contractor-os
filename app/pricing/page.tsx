'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HardHat, Check, ArrowRight, Loader2, DollarSign, AlertTriangle } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

const FEATURES = [
  'Unlimited jobs, time entries, and invoices',
  'Paycheck reconciliation — track taxes, split deposits',
  'Rate cards with quick-apply to new jobs',
  'Rate comparison — earnings across clients and venues',
  'Customizable dashboard with pinnable widgets',
  'Contractor board for peer-to-peer coverage',
  'Venue knowledge base (parking, WiFi, load-in, power)',
  'Union hub — memberships, dues, and document tracking',
  'Multi-account finance tracking with budgets',
  'Document scanner — receipts, pay stubs, call sheets (AI)',
  'Equipment inventory with valuation and depreciation',
  'Travel and mileage logging with fuel tracking',
  'Light/dark/system theme support',
  'Offline-capable PWA — works without internet',
];

interface FoundersData { limit: number; label: string; count: number; remaining: number; active: boolean }
interface PromoData { name: string; discount_type: string; discount_value: number; promo_code: string | null; end_date: string | null; stripe_coupon_id: string | null }
interface CashAppStatus { id: string; status: string; cashapp_name: string }

function applyDiscount(price: number, promo: PromoData | null): number {
  if (!promo) return price;
  if (promo.discount_type === 'percentage') return Math.round(price * (1 - promo.discount_value / 100) * 100) / 100;
  if (promo.discount_type === 'fixed') return Math.max(0, price - promo.discount_value);
  return price;
}

export default function ContractorPricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [founders, setFounders] = useState<FoundersData | null>(null);
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [cashappStatus, setCashappStatus] = useState<CashAppStatus | null>(null);
  const [cashappName, setCashappName] = useState('');
  const [cashappSubmitting, setCashappSubmitting] = useState(false);
  const [cashappError, setCashappError] = useState('');
  const [showCashapp, setShowCashapp] = useState(false);

  useEffect(() => {
    offlineFetch('/api/pricing/founders').then((r) => r.json()).then(setFounders).catch(() => {});
    offlineFetch('/api/pricing/promo').then((r) => r.json()).then((d) => { if (d?.name) setPromo(d); }).catch(() => {});
    // Check if user has a pending cashapp payment (will 401 if not logged in — that's fine)
    offlineFetch('/api/contractor/cashapp').then((r) => r.ok ? r.json() : null).then((d) => { if (d?.payment) setCashappStatus(d.payment); }).catch(() => {});
  }, []);

  const MONTHLY_PRICE = 10.60;
  const ANNUAL_PRICE = 103.29;
  const LIFETIME_PRICE = 103.29;

  const discountedLifetime = applyDiscount(LIFETIME_PRICE, promo);
  const hasDiscount = promo && discountedLifetime < LIFETIME_PRICE;

  async function handleCheckout(plan: string) {
    setLoading(plan);
    setError(null);
    try {
      const body: Record<string, string> = { plan };
      if (promo?.stripe_coupon_id && plan.includes('lifetime')) {
        body.promoCode = promo.promo_code ?? '';
        body.stripeCouponId = promo.stripe_coupon_id;
      }
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { window.location.href = '/signup'; return; }
        setError(data.error ?? 'Something went wrong');
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  async function handleCashappSubmit() {
    if (!cashappName.trim()) { setCashappError('Enter your CashApp name'); return; }
    setCashappSubmitting(true);
    setCashappError('');
    const res = await offlineFetch('/api/contractor/cashapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cashapp_name: cashappName.trim() }),
    });
    if (res.ok) {
      const d = await res.json();
      setCashappStatus(d.payment);
      setCashappName('');
      setShowCashapp(false);
    } else {
      const d = await res.json().catch(() => ({ error: 'Failed' }));
      setCashappError(d.error ?? 'Failed to submit');
    }
    setCashappSubmitting(false);
  }

  const foundersPct = founders ? Math.round((founders.count / founders.limit) * 100) : 0;
  const cashappTag = process.env.NEXT_PUBLIC_CASHAPP_TAG ?? '$WorkWitUS';

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
            <Link href="/login" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 min-h-11 flex items-center">Log In</Link>
            <Link href="/signup" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 min-h-11 flex items-center">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">Simple Pricing</h1>
        <p className="mt-3 text-center text-slate-500">Everything included. No feature gating. No surprises.</p>

        {/* Active promo banner */}
        {promo && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-700">
            <strong>{promo.name}</strong>
            {promo.discount_type === 'percentage' && ` — ${promo.discount_value}% off`}
            {promo.discount_type === 'fixed' && ` — $${promo.discount_value} off`}
            {promo.promo_code && <span className="ml-2 font-mono bg-amber-100 px-2 py-0.5 rounded">{promo.promo_code}</span>}
            {promo.end_date && <span className="ml-2">· Ends {new Date(promo.end_date).toLocaleDateString()}</span>}
          </div>
        )}

        {error && (
          <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">{error}</div>
        )}

        {/* Plan Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {/* Monthly */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-800">Monthly</h2>
            <div className="mt-3">
              <span className="text-4xl font-extrabold text-amber-600">${MONTHLY_PRICE.toFixed(2)}</span>
              <span className="text-slate-400">/month</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">Cancel anytime. No commitment.</p>
            <button onClick={() => handleCheckout('contractor-monthly')} disabled={loading !== null} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 text-base font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11">
              {loading === 'contractor-monthly' ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Processing…</> : <>Subscribe <ArrowRight size={16} aria-hidden="true" /></>}
            </button>
          </div>

          {/* Annual */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-800">Annual</h2>
            <div className="mt-3">
              <span className="text-4xl font-extrabold text-amber-600">${ANNUAL_PRICE.toFixed(2)}</span>
              <span className="text-slate-400">/year</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">${(ANNUAL_PRICE / 12).toFixed(2)}/month, billed annually.</p>
            <button onClick={() => handleCheckout('contractor-annual')} disabled={loading !== null} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 text-base font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11">
              {loading === 'contractor-annual' ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Processing…</> : <>Subscribe <ArrowRight size={16} aria-hidden="true" /></>}
            </button>
          </div>

          {/* Lifetime */}
          <div className="rounded-2xl border-2 border-amber-600 bg-white p-6 relative">
            {founders?.active && (
              <span className="absolute -top-3 left-4 rounded-full bg-amber-600 px-3 py-0.5 text-xs font-bold text-white">
                {founders.label}
              </span>
            )}
            <h2 className="text-lg font-semibold text-slate-800">Lifetime</h2>
            <div className="mt-3">
              {hasDiscount ? (
                <div>
                  <span className="text-2xl text-slate-400 line-through">${LIFETIME_PRICE.toFixed(2)}</span>
                  <span className="text-4xl font-extrabold text-amber-600 ml-2">${discountedLifetime.toFixed(2)}</span>
                </div>
              ) : (
                <span className="text-4xl font-extrabold text-amber-600">${LIFETIME_PRICE.toFixed(2)}</span>
              )}
              <span className="text-slate-400 ml-1">one-time</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">Pay once, use forever. No renewals.</p>

            {/* Founders counter */}
            {founders?.active && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{founders.remaining} of {founders.limit} remaining</span>
                  <span>{foundersPct}% claimed</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${foundersPct}%` }} />
                </div>
              </div>
            )}

            {/* Pay with Card */}
            <button onClick={() => handleCheckout('contractor-lifetime')} disabled={loading !== null || (founders != null && !founders.active)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 text-base font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11">
              {loading === 'contractor-lifetime' ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Processing…</> : <>Pay with Card <ArrowRight size={16} aria-hidden="true" /></>}
            </button>

            {/* Pay with CashApp */}
            {cashappStatus?.status === 'pending' ? (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 text-center">
                CashApp payment pending verification (submitted as <strong>{cashappStatus.cashapp_name}</strong>)
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowCashapp(!showCashapp)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-11"
                  aria-expanded={showCashapp}
                >
                  <DollarSign size={16} aria-hidden="true" />
                  {showCashapp ? 'Hide CashApp' : 'Pay with CashApp'}
                </button>
                {showCashapp && (
                  <div className="mt-3 rounded-lg border border-slate-200 p-4 space-y-3">
                    <p className="text-sm text-slate-600">
                      1. Send <strong>${LIFETIME_PRICE.toFixed(2)}</strong> to <strong className="text-amber-600">{cashappTag}</strong><br />
                      2. Enter your CashApp display name below<br />
                      3. Click &ldquo;I&apos;ve Paid&rdquo; — we&apos;ll verify and upgrade your account
                    </p>
                    <input
                      type="text"
                      value={cashappName}
                      onChange={(e) => setCashappName(e.target.value)}
                      placeholder="Your CashApp name"
                      aria-label="CashApp display name"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    {cashappError && <p className="text-xs text-red-500" role="alert">{cashappError}</p>}
                    <button
                      onClick={handleCashappSubmit}
                      disabled={cashappSubmitting || !cashappName.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 min-h-11"
                    >
                      {cashappSubmitting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <DollarSign size={14} aria-hidden="true" />}
                      I&apos;ve Paid
                    </button>
                  </div>
                )}
              </>
            )}

            {founders && !founders.active && (
              <div className="mt-3 text-center text-sm text-slate-400">
                <AlertTriangle className="w-4 h-4 inline mr-1" aria-hidden="true" />
                Founder&apos;s spots sold out
              </div>
            )}
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
            { q: 'Can I cancel anytime?', a: 'Yes. Monthly plans cancel immediately. Annual plans run through the billing period. Lifetime is a one-time payment with no renewal.' },
            { q: "What is the Founder's Price?", a: `The first ${founders?.limit ?? 100} lifetime members get in at the founder's rate. Once all spots are claimed, the lifetime option closes. This is a limited-time opportunity for early supporters.` },
            { q: 'What payment methods are accepted?', a: 'All major credit cards via Stripe, and CashApp for lifetime purchases. Secure checkout with no card data stored on our servers.' },
            { q: 'How does CashApp payment work?', a: `Send the lifetime amount to our CashApp tag, enter your CashApp name on the pricing page, and click "I've Paid." An admin verifies the payment manually and upgrades your account — usually within 24 hours.` },
            { q: 'Is my data private?', a: 'Yes. Row-level security ensures your data is isolated. Shared features (job board, city guides, union docs) are opt-in only.' },
            { q: 'How do I get help?', a: 'Customer support is managed by a real human — not AI. Reach out through the in-app feedback form or email and a team member will respond personally.' },
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
