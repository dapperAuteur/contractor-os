'use client';

// components/marketing/FeatureGate.tsx
// Wrapper that shows an upgrade overlay when a free user exceeds a feature limit.
// Usage: <FeatureGate feature="jobs" currentCount={jobCount} limit={5} tier={subscriptionStatus}>
//          <JobsContent />
//        </FeatureGate>

import Link from 'next/link';
import { Lock } from 'lucide-react';

interface FeatureGateProps {
  feature: string;
  currentCount: number;
  limit: number;
  tier: string;
  children: React.ReactNode;
}

const FEATURE_LABELS: Record<string, { name: string; upgrade: string }> = {
  jobs: { name: 'Jobs', upgrade: 'unlimited jobs, invoices, and rate cards' },
  invoices: { name: 'Invoices', upgrade: 'unlimited invoices with custom templates' },
  vehicles: { name: 'Vehicles', upgrade: 'unlimited vehicles with fuel and maintenance tracking' },
  equipment: { name: 'Equipment', upgrade: 'unlimited equipment and asset tracking' },
  courses: { name: 'Course Enrollments', upgrade: 'unlimited course access and certificates' },
};

export default function FeatureGate({ feature, currentCount, limit, tier, children }: FeatureGateProps) {
  // Paid users and lifetime members bypass all gates
  if (tier === 'monthly' || tier === 'lifetime') {
    return <>{children}</>;
  }

  // Under limit — show content normally
  if (currentCount < limit) {
    return <>{children}</>;
  }

  const featureInfo = FEATURE_LABELS[feature] ?? { name: feature, upgrade: `unlimited ${feature}` };
  const remaining = Math.max(0, limit - currentCount);

  return (
    <div className="relative">
      {/* Faded content */}
      <div className="opacity-30 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Gate overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl"
        role="alert"
        aria-label={`${featureInfo.name} limit reached`}
      >
        <div className="text-center px-6 py-8 max-w-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mx-auto mb-4">
            <Lock className="w-6 h-6 text-amber-600" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {featureInfo.name} Limit Reached
          </h3>
          <p className="text-sm text-slate-500 mb-5">
            {remaining === 0
              ? `You've used all ${limit} free ${featureInfo.name.toLowerCase()}. Upgrade to unlock ${featureInfo.upgrade}.`
              : `You have ${remaining} free ${featureInfo.name.toLowerCase()} remaining.`
            }
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center px-6 py-3 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-500 transition min-h-11"
          >
            View Plans & Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
