'use client';

// app/admin/page.tsx
// Admin overview dashboard

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, BookOpen, DollarSign, Zap, AlertTriangle, Timer, Utensils, CalendarDays, Map, Trophy } from 'lucide-react';

interface Stats {
  users: { total: number; free: number; monthly: number; lifetime: number; newThisWeek: number };
  content: { blogPosts: number; publicPosts: number; newBlogThisWeek: number };
  featureUsage: { focusSessions: number; mealLogs: number; dailyLogs: number; roadmapTasks: number; blogViews: number };
  revenue: { lifetimeRevenue: number; monthlyMRR: number };
  promoCodesPending: number;
  founders: {
    limit: number;
    paidLifetime: number;
    cashappVerified: number;
    cashappPending: number;
    totalPaid: number;
    giftedLifetime: number;
    remaining: number;
  };
}

function StatCard({ label, value, sub, icon: Icon, color = 'amber' }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color?: string }) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-600',
    sky: 'bg-amber-100 text-amber-600',
    lime: 'bg-lime-100 text-lime-600',
  };
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8 text-red-400">Failed to load stats.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Overview</h1>
      <p className="text-slate-500 text-sm mb-8">Your app at a glance.</p>

      {/* Promo code alert */}
      {stats.promoCodesPending > 0 && (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
          <p className="text-amber-700 text-sm">
            <strong>{stats.promoCodesPending}</strong> lifetime member{stats.promoCodesPending > 1 ? 's have' : ' has'} no promo code yet.{' '}
            <Link href="/admin/users?filter=promo_pending" className="underline font-semibold">View them →</Link>
          </p>
        </div>
      )}

      {/* Founders progress — lifetime memberships sold against the 100-spot cap */}
      {stats.founders && (
        <section className="mb-8" aria-labelledby="founders-heading">
          <h2 id="founders-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-3">
            Founder&apos;s Lifetime Spots
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                  <Trophy className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Paid lifetime memberships sold</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {stats.founders.totalPaid}
                    <span className="text-base font-normal text-slate-400"> / {stats.founders.limit}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Remaining</p>
                <p className={`text-2xl font-bold ${stats.founders.remaining === 0 ? 'text-red-600' : 'text-lime-600'}`}>
                  {stats.founders.remaining}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div
              className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4"
              role="progressbar"
              aria-valuenow={stats.founders.totalPaid}
              aria-valuemin={0}
              aria-valuemax={stats.founders.limit}
              aria-label={`${stats.founders.totalPaid} of ${stats.founders.limit} founder spots sold`}
            >
              <div
                className={`h-full rounded-full transition-all ${stats.founders.remaining === 0 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, Math.round((stats.founders.totalPaid / Math.max(stats.founders.limit, 1)) * 100))}%` }}
              />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Stripe paid</p>
                <p className="text-lg font-semibold text-slate-900">{stats.founders.paidLifetime}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">CashApp verified</p>
                <p className="text-lg font-semibold text-slate-900">{stats.founders.cashappVerified}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-amber-600">CashApp pending</p>
                <p className="text-lg font-semibold text-amber-600">
                  {stats.founders.cashappPending}
                  {stats.founders.cashappPending > 0 && (
                    <Link href="/admin/cashapp" className="ml-2 text-xs text-amber-600 hover:underline">review →</Link>
                  )}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Gifted / admin</p>
                <p className="text-lg font-semibold text-slate-900">{stats.founders.giftedLifetime}</p>
              </div>
            </div>

            {stats.founders.remaining === 0 && (
              <p className="mt-4 text-xs text-slate-500 text-center">
                Founder spots sold out. Annual plan ($103.29/year) is now live on the pricing page.{' '}
                <Link href="/admin/promos" className="text-amber-600 hover:underline">Run a promo →</Link>
              </p>
            )}
          </div>
        </section>
      )}

      {/* Users */}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-3">Users</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.users.total} icon={Users} />
        <StatCard label="Free" value={stats.users.free} sub={`${Math.round(stats.users.free / Math.max(stats.users.total, 1) * 100)}% of users`} icon={Users} color="sky" />
        <StatCard label="Monthly ($10)" value={stats.users.monthly} sub={`$${stats.revenue.monthlyMRR}/mo MRR`} icon={Zap} color="amber" />
        <StatCard label="Lifetime ($100)" value={stats.users.lifetime} sub={`$${stats.revenue.lifetimeRevenue} total`} icon={DollarSign} color="lime" />
      </div>

      {/* Content */}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-3">Content</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Blog Posts" value={stats.content.blogPosts} sub={`${stats.content.publicPosts} public`} icon={BookOpen} color="amber" />
        <StatCard label="New Posts" value={stats.content.newBlogThisWeek} sub="this week" icon={BookOpen} color="amber" />
      </div>

      {/* Feature usage */}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-3">Feature Usage (all-time)</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Focus Sessions" value={stats.featureUsage.focusSessions} icon={Timer} color="amber" />
        <StatCard label="Meal Logs" value={stats.featureUsage.mealLogs} icon={Utensils} color="sky" />
        <StatCard label="Daily Debriefs" value={stats.featureUsage.dailyLogs} icon={CalendarDays} color="lime" />
        <StatCard label="Roadmap Tasks" value={stats.featureUsage.roadmapTasks} icon={Map} color="amber" />
        <StatCard label="Blog Views" value={stats.featureUsage.blogViews} icon={BookOpen} color="amber" />
      </div>

      {/* New users this week */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-slate-500 text-sm mb-1">New users this week</p>
        <p className="text-4xl font-bold text-slate-900">{stats.users.newThisWeek}</p>
      </div>
    </div>
  );
}
