'use client';

// app/academy/teach/page.tsx
// Landing page for teachers — explains the teaching program and lets users subscribe.

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Users, DollarSign, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

const BENEFITS = [
  { icon: BookOpen,   title: 'Flexible Course Formats',   desc: 'Video, audio, text, slides — or mix them all. Linear or CYOA adventure paths.' },
  { icon: Users,      title: 'Built-In Audience',          desc: 'Reach the Work.WitUS community of health-focused learners immediately.' },
  { icon: DollarSign, title: 'Keep the Majority',          desc: 'Set your own price. Work.WitUS takes a small platform fee; the rest goes to you via Stripe.' },
  { icon: Zap,        title: 'Assignments & Live Sessions', desc: 'Grade submissions, give feedback, and host live streams — all in one place.' },
];

export default function TeachLandingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<'teacher' | 'teacher-annual'>('teacher-annual');

  async function handleSubscribe() {
    if (!user) {
      window.location.href = '/login?next=/academy/teach';
      return;
    }
    setLoading(true);
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <span className="inline-block px-3 py-1 mb-6 rounded-full bg-amber-900/50 text-amber-300 text-sm font-medium">
          Work.WitUS Academy — Teach
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
          Share your knowledge.<br />
          Build a sustainable income.
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Host free or paid courses on Work.WitUS. Reach an audience obsessed with living
          healthier, longer lives — and get paid directly through Stripe.
        </p>
      </section>

      {/* Benefits */}
      <section className="max-w-4xl mx-auto px-6 pb-16 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {BENEFITS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white border border-slate-200 rounded-xl p-6">
            <Icon className="w-6 h-6 text-amber-400 mb-4" />
            <h3 className="font-semibold text-white mb-2">{title}</h3>
            <p className="text-slate-500 text-sm">{desc}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="max-w-xl mx-auto px-6 pb-24">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Become a Teacher</h2>
          <p className="text-slate-500 text-sm mb-8">
            Your teaching subscription is separate from your member plan. Cancel any time.
          </p>

          {/* Plan toggle */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setPlan('teacher')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                plan === 'teacher'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPlan('teacher-annual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                plan === 'teacher-annual'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:text-white'
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-amber-300">Save ~20%</span>
            </button>
          </div>

          <div className="space-y-3 text-left mb-8">
            {[
              'Unlimited courses',
              'All content formats (video, audio, text, slides)',
              'Linear & CYOA learning paths',
              'Assignments with grading & feedback',
              'Live session scheduling',
              'Promo codes & discounts',
              'Stripe Connect payouts',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                {feat}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold text-base hover:bg-amber-700 transition disabled:opacity-50"
          >
            {loading ? 'Redirecting…' : (
              <>
                Get Started <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {!user && (
            <p className="mt-4 text-slate-400 text-xs">
              You&apos;ll be asked to log in or create an account before checkout.
            </p>
          )}
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          Already a teacher?{' '}
          <Link href="/dashboard/teaching" className="text-amber-400 hover:text-amber-300">
            Go to your dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}
