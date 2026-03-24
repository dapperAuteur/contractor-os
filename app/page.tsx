import type { Metadata } from 'next';
import Link from 'next/link';
import {
  HardHat, FileText, CreditCard, BarChart3, Users, Building2,
  MapPin, Scale, Car, DollarSign, ScanLine, Shield, ArrowRight, Play,
  Package, ArrowUpDown,
} from 'lucide-react';
import { organizationSchema } from '@/lib/seo/json-ld';

export const metadata: Metadata = {
  title: 'Work.WitUS — Job Tracking for Independent Contractors',
  description: 'Track jobs, invoices, travel, and union benefits — built for crew & production contractors. $10/month or $100/year.',
  openGraph: {
    title: 'Work.WitUS — Job Tracking for Independent Contractors',
    description: 'Track jobs, invoices, travel, and union benefits — built for crew & production contractors.',
    url: '/',
    type: 'website',
  },
  alternates: { canonical: '/' },
};

const FEATURES = [
  { slug: 'jobs', icon: HardHat, title: 'Job Management', desc: 'Track assignments, time entries with ST/OT/DT splits, and generate invoices automatically.' },
  { slug: 'rate-cards', icon: CreditCard, title: 'Rate Cards', desc: 'Save rate presets by union and department. Apply rates to new jobs with one click.' },
  { slug: 'compare', icon: ArrowUpDown, title: 'Rate Comparison', desc: 'Compare earnings across venues, clients, and departments. Know your highest-paying gigs.' },
  { slug: 'reports', icon: BarChart3, title: 'Reports & Analytics', desc: 'Earnings charts, 1099 tracking, hours breakdown, and tax-ready exports.' },
  { slug: 'board', icon: Users, title: 'Contractor Board', desc: 'Find colleagues to cover your dates or pick up extra work. Peer-to-peer crew network.' },
  { slug: 'venues', icon: Building2, title: 'Venue Knowledge Base', desc: 'Parking, WiFi, load-in details, and crew notes for every venue you work.' },
  { slug: 'cities', icon: MapPin, title: 'City Guides', desc: 'Your personal guide to restaurants, hotels, gyms, and coffee spots in every city.' },
  { slug: 'union', icon: Scale, title: 'Union Hub', desc: 'Track memberships, dues, documents, and contracts across all your locals.' },
  { slug: 'travel', icon: Car, title: 'Travel & Mileage', desc: 'Trip logging, fuel tracking, vehicle maintenance, and multi-stop route planning.' },
  { slug: 'invoices', icon: FileText, title: 'Invoice Generation', desc: 'Auto-generate invoices from time entries with ST/OT/DT line items and payment tracking.' },
  { slug: 'finance', icon: DollarSign, title: 'Finance Tracking', desc: 'Multi-account income and expense tracking with budgets, categories, and trends.' },
  { slug: 'equipment', icon: Package, title: 'Equipment Tracker', desc: 'Gear inventory with purchase price, current value, depreciation, and job linking.' },
  { slug: 'scan', icon: ScanLine, title: 'Document Scanner', desc: 'Capture receipts, call sheets, and pay stubs. AI extracts and categorizes the data.' },
];

export default function ContractorLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }} />
      {/* Nav */}
      <nav className="border-b border-slate-200 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat size={24} className="text-amber-600" aria-hidden="true" />
            <span className="text-lg font-bold">Work.WitUS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-slate-500 hover:text-slate-900 min-h-11 flex items-center">
              Pricing
            </Link>
            <Link href="/features/contractor" className="text-sm text-slate-500 hover:text-slate-900 min-h-11 flex items-center">
              Features
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
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          Your Work Hub.
          <span className="block text-amber-600">One Place for Everything.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
          Jobs, invoices, mileage, expenses, union contracts, venue knowledge — all in one
          tool built for independent broadcast and production contractors.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-base font-medium text-white hover:bg-amber-500 min-h-11"
          >
            Get Started <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/demo"
            className="flex items-center gap-2 rounded-lg border border-amber-600/50 px-6 py-3 text-base text-amber-600 hover:bg-amber-600/10 min-h-11"
          >
            <Play size={16} aria-hidden="true" /> Try the Demo
          </Link>
          <Link
            href="/pricing"
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-6 py-3 text-base text-slate-700 hover:bg-slate-100 min-h-11"
          >
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features — each card links to detail page */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-label="Features">
        <h2 className="mb-4 text-center text-2xl font-bold sm:text-3xl">Built for Contractors</h2>
        <p className="mb-10 text-center text-slate-500 text-sm">Click any feature to learn more and try the demo</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.slug}
              href={`/features/contractor/${f.slug}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:bg-slate-50 transition"
            >
              <f.icon size={20} className="text-amber-600 mb-3" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-900 group-hover:text-slate-900 transition">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-600 group-hover:text-amber-500 transition">
                Learn more <ArrowRight size={12} aria-hidden="true" />
              </span>
            </Link>
          ))}
          {/* Privacy — no detail page */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <Shield size={20} className="text-amber-600 mb-3" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-900">Privacy First</h3>
            <p className="mt-1 text-sm text-slate-500">Your data stays yours. RLS-protected, no data sharing without your consent.</p>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="border-t border-slate-200 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl mb-3">Try Before You Buy</h2>
          <p className="text-slate-500 mb-2">
            Explore Work.WitUS with a pre-loaded demo account. Real data, real features — no signup required.
          </p>
          <p className="text-sm text-slate-400 mb-8">
            Shared account. Data resets daily. Do not enter personal information.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/demo"
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-amber-500 transition min-h-11"
            >
              <Play size={18} aria-hidden="true" /> Launch Demo
            </Link>
            <Link
              href="/features/contractor"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-8 py-3.5 text-base text-slate-700 hover:bg-slate-100 transition min-h-11"
            >
              Explore All Features
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3 text-left">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-amber-600 mb-1">Pre-loaded Data</p>
              <p className="text-xs text-slate-400">Jobs, invoices, rate cards, contacts, financial transactions, and more.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-amber-600 mb-1">Interactive Tours</p>
              <p className="text-xs text-slate-400">Guided walkthroughs for every module. Start from any feature page.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-amber-600 mb-1">Full Access</p>
              <p className="text-xs text-slate-400">Every feature unlocked. Try jobs, venues, cities, invoicing, travel, and more.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Academy Link */}
      <section className="border-t border-slate-200 py-12 text-center">
        <p className="text-sm text-slate-500">New to Work.WitUS?</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">Take the free Contractor Work.WitUS Guide</p>
        <p className="mt-2 text-sm text-slate-400">15 lessons covering everything from job creation to 1099 tracking. No account required.</p>
        <Link href="/academy" className="mt-3 inline-block text-sm font-medium text-amber-600 hover:text-amber-500 min-h-11">
          Browse Academy courses &rarr;
        </Link>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 py-16 text-center">
        <h2 className="text-2xl font-bold">Ready to get organized?</h2>
        <p className="mt-2 text-slate-500">$10/month or $100/year. No free tier — just the tools you need.</p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-base font-medium text-white hover:bg-amber-500 min-h-11"
          >
            Get Started <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-6 py-3 text-sm text-slate-700 hover:border-slate-300 min-h-11"
          >
            Already have an account? Log in
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} Work.WitUS. All rights reserved.</p>
        <p className="mt-1">Powered by <a href="https://WitUS.Online" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">WitUS.Online</a>, a B4C LLC brand</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/terms" className="hover:text-slate-500">Terms</Link>
          <Link href="/privacy" className="hover:text-slate-500">Privacy</Link>
          <a href="https://CentenarianOS.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">CentenarianOS</a>
          <a href="https://WitUS.Online" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500">WitUS.Online</a>
        </div>
      </footer>
    </div>
  );
}
