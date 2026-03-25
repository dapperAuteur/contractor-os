import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  HardHat, ArrowRight, Play, CheckCircle2,
  Clapperboard, Music, Projector, Camera, Laptop, Stethoscope,
  Clock, FileText, Package, ScanLine, Scale, CreditCard, Users,
  Building2, MapPin, DollarSign, BarChart3, Car, ArrowUpDown,
  Calculator, FileSpreadsheet, FileX, Wrench, Receipt, Calendar,
  TrendingDown,
} from 'lucide-react';
import { INDUSTRY_CONFIGS, getIndustryConfig } from '@/lib/features/industry-configs';
import { organizationSchema } from '@/lib/seo/json-ld';

// Icon registry — all icons used in industry configs
const ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  HardHat, Clapperboard, Music, Projector, Camera, Laptop, Stethoscope,
  Clock, FileText, Package, ScanLine, Scale, CreditCard, Users,
  Building2, MapPin, DollarSign, BarChart3, Car, ArrowUpDown,
  Calculator, FileSpreadsheet, FileX, Wrench, Receipt, Calendar,
  TrendingDown,
};

function getIcon(name: string) {
  return ICONS[name] ?? HardHat;
}

export function generateStaticParams() {
  return INDUSTRY_CONFIGS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const config = getIndustryConfig(slug);
  if (!config) return {};
  return {
    title: config.metadata.title,
    description: config.metadata.description,
    keywords: config.metadata.keywords,
    openGraph: {
      title: config.metadata.title,
      description: config.metadata.description,
      url: `/for/${slug}`,
      type: 'website',
    },
    alternates: { canonical: `/for/${slug}` },
  };
}

export default async function IndustryDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const config = getIndustryConfig(slug);
  if (!config) notFound();

  const HeroIcon = getIcon(config.icon);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Work.WitUS for ${config.name}`,
    description: config.description,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://work.witus.com'}/for/${slug}`,
    provider: organizationSchema(),
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
            <Link href="/for" className="text-sm text-slate-500 hover:text-slate-900 min-h-11 flex items-center">
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
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <HeroIcon size={32} className="text-amber-600" aria-hidden="true" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          {config.heroHeading}
          <span className="block text-amber-600">{config.heroAccent}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
          {config.description}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-base font-medium text-white hover:bg-amber-500 min-h-11"
          >
            {config.ctaText} <ArrowRight size={16} aria-hidden="true" />
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

      {/* Pain Points */}
      <section className="border-t border-slate-200 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-2xl font-bold sm:text-3xl mb-2">Sound Familiar?</h2>
          <p className="text-center text-slate-500 mb-10">These are the problems Work.WitUS was built to solve.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {config.painPoints.map((pp, idx) => {
              const PpIcon = getIcon(pp.icon);
              return (
                <div key={idx} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <PpIcon size={20} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-slate-700">{pp.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16" aria-label="Features">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold sm:text-3xl mb-2">How Work.WitUS Helps</h2>
          <p className="text-center text-slate-500 mb-10">Everything you need — built into one app.</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {config.featuredFeatures.map((feat) => {
              const FeatIcon = getIcon(feat.icon);
              return (
                <Link
                  key={feat.slug + feat.title}
                  href={`/features/contractor/${feat.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  <FeatIcon size={20} className="text-amber-600 mb-3" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-slate-900">{feat.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{feat.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-600 group-hover:text-amber-500 transition">
                    Learn more <ArrowRight size={12} aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-slate-200 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-2xl font-bold sm:text-3xl mb-10">Get Started in Minutes</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Create Your Account', desc: 'Sign up in under a minute. No credit card required to start the demo.' },
              { step: '2', title: 'Set Up Your Profile', desc: 'Add your rate cards, contacts, and equipment. Import existing data via CSV.' },
              { step: '3', title: 'Start Tracking', desc: 'Log your first job, clock in, and generate your first invoice.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold text-lg">
                  {s.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
                <p className="text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing nudge */}
      <section className="border-t border-slate-200 py-12 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-xl font-bold mb-2">One Price. Every Feature.</h2>
          <p className="text-slate-500 mb-1">$10/month or $100/year. No feature gates, no upsells.</p>
          <p className="text-sm text-slate-400 mb-6">Every tool on this page is included in every plan.</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-500 min-h-11"
            >
              View pricing details <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-slate-900 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Organized?</h2>
          <p className="text-slate-400 mb-8 text-lg">
            Join contractors who use Work.WitUS to track their work and grow their business.
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

      {/* Other industries */}
      <section className="border-t border-slate-200 py-12 text-center">
        <p className="text-sm text-slate-500 mb-2">Also built for</p>
        <div className="flex flex-wrap justify-center gap-3 px-4">
          {INDUSTRY_CONFIGS.filter((c) => c.slug !== slug).map((c) => (
            <Link
              key={c.slug}
              href={`/for/${c.slug}`}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition min-h-11 flex items-center"
            >
              {c.shortName}
            </Link>
          ))}
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
          <Link href="/for" className="hover:text-slate-500">Industries</Link>
        </div>
      </footer>
    </div>
  );
}
