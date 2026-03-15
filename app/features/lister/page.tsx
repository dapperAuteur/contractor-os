import Link from 'next/link';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import FeatureCard from '@/components/features/FeatureCard';
import {
  LISTER_FEATURES,
  LISTER_FEATURE_GROUPS,
} from '@/lib/features/lister-features';

export const metadata = {
  title: 'CrewOps Features — Work.WitUS',
  description:
    'Explore every feature of CrewOps, the crew management app. Create jobs, manage rosters, assign contractors, and communicate with your team.',
};

export default function ListerFeaturesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-slate-50/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-sm font-medium min-h-11"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Home
          </Link>
          <Link
            href="/features/contractor"
            className="text-amber-600 hover:text-amber-500 text-sm font-medium transition min-h-11 flex items-center"
          >
            Work.WitUS Features →
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 mb-5">
            <ClipboardList className="w-7 h-7 text-indigo-600" aria-hidden="true" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            CrewOps Features
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Everything a lister needs to create jobs, build a roster, assign contractors, and keep the crew informed.
          </p>
        </div>

        {/* Feature groups */}
        {LISTER_FEATURE_GROUPS.map((group) => {
          const features = group.slugs
            .map((s) => LISTER_FEATURES.find((f) => f.slug === s))
            .filter(Boolean) as typeof LISTER_FEATURES;

          return (
            <div key={group.label} className="mb-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                {group.label}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((f) => (
                  <FeatureCard key={f.slug} feature={f} app="lister" />
                ))}
              </div>
            </div>
          );
        })}

        {/* CTA */}
        <div className="mt-12 flex flex-col sm:flex-row gap-3">
          <Link
            href="/signup?from=features-lister"
            className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition min-h-11"
          >
            Get Started
          </Link>
          <Link
            href="/features/contractor"
            className="flex items-center justify-center px-6 py-3 border border-slate-200 text-slate-800 hover:bg-slate-100 rounded-xl text-sm font-semibold transition min-h-11"
          >
            Explore Work.WitUS (Contractor) Features
          </Link>
        </div>
      </div>
    </div>
  );
}
