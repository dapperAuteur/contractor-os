import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, Circle, Clock, ArrowRight,
  Briefcase, DollarSign, Car, Wrench, Users, ScanLine,
  GraduationCap, MapPin, Shield, BookOpen, Settings, BarChart3,
  Landmark, Smartphone, Sparkles, FileCheck, UserCheck, CalendarSync,
  LayoutGrid, Target, Repeat, PenTool, CircleDollarSign,
  LayoutDashboard, Globe, CalendarDays,
} from 'lucide-react';
import SiteFooter from '@/components/ui/SiteFooter';
import { ROADMAP_CATEGORIES, UPCOMING_FEATURES } from '@/lib/features/roadmap-data';
import type { RoadmapCategory, UpcomingFeature } from '@/lib/features/roadmap-data';

export const metadata: Metadata = {
  title: 'Product Roadmap — Work.WitUS',
  description: 'See what we\'ve shipped and what\'s coming next. Work.WitUS product roadmap for independent contractors.',
  openGraph: {
    title: 'Product Roadmap — Work.WitUS',
    description: 'See what we\'ve shipped and what\'s coming next for independent contractors.',
    url: '/tech-roadmap',
    type: 'website',
  },
  alternates: { canonical: '/tech-roadmap' },
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Briefcase, Clock, DollarSign, Car, Wrench, Users, ScanLine,
  GraduationCap, MapPin, Shield, BookOpen, Settings, BarChart3,
};

const UPCOMING_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Landmark, Smartphone, Sparkles, FileCheck, UserCheck, CalendarSync,
  LayoutGrid, Target, Repeat, PenTool, CircleDollarSign,
  LayoutDashboard, Globe, CalendarDays,
};

function getCategoryIcon(name: string) {
  return CATEGORY_ICONS[name] ?? Briefcase;
}

function getUpcomingIcon(name: string) {
  return UPCOMING_ICONS[name] ?? Sparkles;
}

function countByStatus(categories: RoadmapCategory[], status: string) {
  return categories.flatMap((c) => c.features).filter((f) => f.status === status).length;
}

export default function RoadmapPage() {
  const shipped = countByStatus(ROADMAP_CATEGORIES, 'shipped');
  const inProgress = countByStatus(ROADMAP_CATEGORIES, 'in-progress');
  const planned = countByStatus(ROADMAP_CATEGORIES, 'planned');
  const total = shipped + inProgress + planned;
  const pct = Math.round((shipped / total) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 min-h-11">
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-linear-to-br from-amber-500 to-amber-600 rounded-lg" aria-hidden="true" />
            <span className="text-xl font-bold text-slate-900">Work.WitUS</span>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-3">
          Product Roadmap
        </h1>
        <p className="text-xl text-slate-600 mb-2">
          From MVP to a comprehensive contractor operating system.
        </p>
        <p className="text-sm text-slate-500 mb-8">Updated March 2026</p>

        {/* Overall progress */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Overall Progress</p>
              <p className="text-3xl font-extrabold text-slate-900">{pct}%</p>
            </div>
            <div className="flex gap-6 text-sm text-right">
              <div>
                <p className="font-bold text-lime-600 text-lg">{shipped}</p>
                <p className="text-slate-400">Shipped</p>
              </div>
              <div>
                <p className="font-bold text-amber-600 text-lg">{inProgress}</p>
                <p className="text-slate-400">In progress</p>
              </div>
              <div>
                <p className="font-bold text-slate-500 text-lg">{planned}</p>
                <p className="text-slate-400">Planned</p>
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className="bg-linear-to-r from-amber-500 to-lime-500 h-3 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">{shipped} of {total} features shipped</p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/demo"
            className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors font-medium min-h-11 flex items-center"
          >
            Try the Demo
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium min-h-11 flex items-center"
          >
            Get Started
          </Link>
          <Link
            href="/academy"
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium min-h-11 flex items-center"
          >
            Browse Academy
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">What We&apos;ve Built</h2>
        <div className="space-y-6">
          {ROADMAP_CATEGORIES.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            const catShipped = cat.features.filter((f) => f.status === 'shipped').length;
            const catTotal = cat.features.length;
            const catPct = Math.round((catShipped / catTotal) * 100);
            const allShipped = catPct === 100;

            return (
              <div key={cat.slug} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                {/* Category header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg shrink-0 ${allShipped ? 'bg-lime-50' : 'bg-amber-50'}`}>
                    <Icon size={20} className={allShipped ? 'text-lime-600' : 'text-amber-600'} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{cat.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                        allShipped
                          ? 'bg-lime-100 text-lime-800'
                          : catShipped > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}>
                        {allShipped ? 'Complete' : catShipped > 0 ? 'In Progress' : 'Planned'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{cat.description}</p>
                  </div>
                </div>

                {/* Mini progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{catShipped}/{catTotal} features</span>
                    <span>{catPct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${allShipped ? 'bg-lime-500' : 'bg-amber-500'}`}
                      style={{ width: `${catPct}%` }}
                    />
                  </div>
                </div>

                {/* Feature list */}
                <ul className="space-y-2">
                  {cat.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      {feat.status === 'shipped' ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-lime-600" aria-hidden="true" />
                      ) : feat.status === 'in-progress' ? (
                        <Clock className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" aria-hidden="true" />
                      ) : (
                        <Circle className="w-5 h-5 shrink-0 mt-0.5 text-slate-300" aria-hidden="true" />
                      )}
                      <span className={feat.status === 'shipped' ? 'text-slate-700' : feat.status === 'in-progress' ? 'text-slate-600' : 'text-slate-400'}>
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Coming Soon */}
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Coming Soon</h2>
          <p className="text-slate-500 mb-8">Features on our radar for upcoming releases.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {UPCOMING_FEATURES.map((feat) => {
              const Icon = getUpcomingIcon(feat.icon);
              return (
                <div key={feat.title} className="rounded-xl border border-dashed border-slate-300 p-5 bg-slate-50/50">
                  <Icon size={20} className="text-amber-600 mb-3" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">{feat.title}</h3>
                  <p className="text-xs text-slate-500">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA footer band */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-slate-400 mb-8 text-lg">
            $10/month or $100/year. Every feature included.
          </p>
          <div className="flex justify-center flex-wrap gap-4">
            <Link
              href="/signup"
              className="px-8 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors font-semibold min-h-11 flex items-center gap-2"
            >
              Get Started <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/demo"
              className="px-8 py-3 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors font-semibold min-h-11 flex items-center"
            >
              Try the Demo
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter theme="light" />
    </div>
  );
}
