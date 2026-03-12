import {
  HardHat, FileText, CreditCard, BarChart3, Building2,
  MapPin, Scale, Car, ScanLine, DollarSign, Users,
  RefreshCw, Shield, UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import DemoLoginButton from '@/components/ui/DemoLoginButton';

const MODULES = [
  { icon: HardHat, title: 'Job Management', desc: 'Track assignments, time entries, ST/OT/DT splits' },
  { icon: CreditCard, title: 'Rate Cards', desc: 'Save rate presets by union and department' },
  { icon: FileText, title: 'Invoices', desc: 'Auto-generate invoices from time entries' },
  { icon: BarChart3, title: 'Financial Reports', desc: 'Earnings by client, 1099 tracking, tax exports' },
  { icon: DollarSign, title: 'Dues Tracking', desc: 'Union memberships, dues scheduling, payment history' },
  { icon: Building2, title: 'Venue Knowledge', desc: 'Parking, WiFi, load-in details for every venue' },
  { icon: MapPin, title: 'City Guides', desc: 'Restaurant, hotel, gym recs by city' },
  { icon: Scale, title: 'Union Contract Chat', desc: 'AI-powered contract Q&A with disclaimers' },
  { icon: Car, title: 'Mileage + Expenses', desc: 'Trip logging, fuel tracking, expense reports' },
  { icon: ScanLine, title: 'Pay Stub Scan', desc: 'AI extracts hours, rates, and benefits from photos' },
  { icon: Users, title: 'Job Board', desc: 'Find replacement work or share jobs' },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Nav */}
      <nav className="border-b border-neutral-800 px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 min-h-11">
            <HardHat size={24} className="text-amber-400" aria-hidden="true" />
            <span className="text-lg font-bold">Work.WitUS</span>
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 min-h-11 flex items-center"
          >
            Log In
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold sm:text-4xl mb-4">
            Try Work.WitUS <span className="text-amber-400">Risk-Free</span>
          </h1>
          <p className="text-neutral-400 text-lg max-w-xl mx-auto">
            Explore every feature with a pre-loaded demo account. Real data, real
            tools — no signup required.
          </p>
        </div>

        {/* How it works */}
        <div className="grid gap-4 sm:grid-cols-3 mb-12">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 text-center">
            <UserCheck className="w-6 h-6 text-amber-400 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-neutral-200 mb-1">Shared Account</p>
            <p className="text-xs text-neutral-500">
              One demo account for all visitors. No personal info needed.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 text-center">
            <RefreshCw className="w-6 h-6 text-amber-400 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-neutral-200 mb-1">Daily Reset</p>
            <p className="text-xs text-neutral-500">
              Data resets every night. Feel free to experiment — nothing is permanent.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 text-center">
            <Shield className="w-6 h-6 text-amber-400 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-neutral-200 mb-1">Full Access</p>
            <p className="text-xs text-neutral-500">
              Every feature unlocked. Jobs, invoices, venues, travel, and more.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mb-16">
          <DemoLoginButton from="demo-page" className="inline-block" />
        </div>

        {/* Modules */}
        <div>
          <h2 className="text-xl font-semibold mb-6 text-center">What&apos;s Included</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {MODULES.map((m) => (
              <div
                key={m.title}
                className="flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
              >
                <m.icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-neutral-200">{m.title}</p>
                  <p className="text-xs text-neutral-500">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <p className="mt-12 text-center text-xs text-neutral-500">
          This is a shared demo account. Do not enter personal, financial, or
          sensitive information. Data may be visible to other demo visitors and is
          reset daily.
        </p>

        {/* Footer links */}
        <div className="mt-8 flex justify-center gap-6 text-sm">
          <Link href="/features/contractor" className="text-amber-400 hover:text-amber-300 min-h-11 flex items-center">
            Explore Features
          </Link>
          <Link href="/signup" className="text-neutral-400 hover:text-neutral-200 min-h-11 flex items-center">
            Create Your Account
          </Link>
        </div>
      </div>
    </div>
  );
}
