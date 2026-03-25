import type { Metadata } from 'next';
import Link from 'next/link';
import {
  HardHat, ArrowRight, Clapperboard, Music, Projector,
  Camera, Laptop, Stethoscope,
} from 'lucide-react';
import SiteFooter from '@/components/ui/SiteFooter';
import { INDUSTRY_CONFIGS } from '@/lib/features/industry-configs';
import { organizationSchema } from '@/lib/seo/json-ld';

export const metadata: Metadata = {
  title: 'Work.WitUS for Every Industry — Job Tracking for Independent Contractors',
  description: 'Work.WitUS helps independent contractors in film production, live events, construction, photography, IT consulting, healthcare, and more track jobs, invoices, and expenses.',
  openGraph: {
    title: 'Work.WitUS for Every Industry',
    description: 'Job tracking, invoicing, and business tools built for independent contractors across every industry.',
    url: '/for',
    type: 'website',
  },
  alternates: { canonical: '/for' },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Clapperboard, Music, Projector, HardHat, Camera, Laptop, Stethoscope,
};

function getIcon(name: string) {
  return ICON_MAP[name] ?? HardHat;
}

export default function IndustriesIndexPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }} />

      {/* Nav */}
      <nav className="border-b border-slate-200 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <HardHat size={24} className="text-amber-600" aria-hidden="true" />
            <span className="text-lg font-bold">Work.WitUS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-slate-500 hover:text-slate-900 min-h-11 flex items-center">
              Pricing
            </Link>
            <Link href="/features/contractor" className="text-sm text-slate-500 hover:text-slate-900 min-h-11 flex items-center">
              Features
            </Link>
            <Link href="/for" className="text-sm text-amber-600 font-medium min-h-11 flex items-center">
              Industries
            </Link>
            <Link href="/tech-roadmap" className="text-sm text-slate-500 hover:text-slate-900 min-h-11 flex items-center">
              Roadmap
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 min-h-11 flex items-center"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 min-h-11 flex items-center"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Built for Every
          <span className="block text-amber-600">Independent Contractor.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
          Whether you&apos;re on set, on site, or on the road — Work.WitUS adapts to your industry.
          Track jobs, log hours, manage equipment, send invoices, and stay organized.
        </p>
      </section>

      {/* Industry cards */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRY_CONFIGS.map((industry) => {
            const Icon = getIcon(industry.icon);
            return (
              <Link
                key={industry.slug}
                href={`/for/${industry.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300 hover:bg-slate-50 transition"
              >
                <Icon size={24} className="text-amber-600 mb-4" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-900 mb-1">{industry.shortName}</h2>
                <p className="text-sm text-slate-500 mb-4">{industry.tagline}</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 group-hover:text-amber-500 transition">
                  Learn more <ArrowRight size={12} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Catch-all CTA */}
      <section className="border-t border-slate-200 py-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-bold sm:text-3xl mb-3">Don&apos;t See Your Industry?</h2>
          <p className="text-slate-500 mb-8">
            Work.WitUS works for any independent contractor who tracks jobs, logs hours, sends invoices,
            or manages expenses. If you&apos;re self-employed, this tool was built for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-base font-medium text-white hover:bg-amber-500 min-h-11"
            >
              Get Started <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/demo"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-6 py-3 text-base text-slate-700 hover:bg-slate-100 min-h-11"
            >
              Try the Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} Work.WitUS. All rights reserved.</p>
        <p className="mt-1">Powered by <a href="https://WitUS.Online" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">WitUS.Online</a>, a B4C LLC brand</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/terms" className="hover:text-slate-500">Terms</Link>
          <Link href="/privacy" className="hover:text-slate-500">Privacy</Link>
          <Link href="/tech-roadmap" className="hover:text-slate-500">Roadmap</Link>
        </div>
      </footer>
    </div>
  );
}
