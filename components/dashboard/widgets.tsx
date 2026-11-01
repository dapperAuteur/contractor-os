'use client';

// components/dashboard/widgets.tsx
// Widget registry and individual widget components for the customizable dashboard.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, Clock, DollarSign, Wrench, GraduationCap, FileText,
  ArrowRight, Loader2, TrendingUp, CalendarDays,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';
import { LEARN_WITUS_GUIDES, WORK_WITUS_GUIDES_SERIES_URL } from '@/lib/ecosystem/learn-witus.mjs';

// ─── Widget Registry ────────────────────────────────────────────────────────

export interface WidgetDef {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  paid?: boolean;
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  { id: 'jobs-summary', label: 'Job Status', description: 'Assigned, in-progress, completed, paid counts', icon: Briefcase, component: JobsSummaryWidget },
  { id: 'upcoming-jobs', label: 'Upcoming Jobs', description: 'Next 5 upcoming jobs by start date', icon: CalendarDays, component: UpcomingJobsWidget },
  { id: 'recent-time', label: 'Recent Time', description: 'Hours logged this week', icon: Clock, component: RecentTimeWidget },
  { id: 'finance-snapshot', label: 'Finance', description: 'Account balances and recent transactions', icon: DollarSign, component: FinanceSnapshotWidget, paid: true },
  { id: 'equipment-value', label: 'Equipment', description: 'Total equipment value', icon: Wrench, component: EquipmentValueWidget, paid: true },
  { id: 'academy-progress', label: 'Learn.WitUS', description: 'The Work.WitUS guides on Learn.WitUS', icon: GraduationCap, component: LearnWidget },
  { id: 'invoices-due', label: 'Invoices Due', description: 'Unpaid and overdue invoices', icon: FileText, component: InvoicesDueWidget },
];

// ─── Shared Widget Shell ────────────────────────────────────────────────────

function WidgetShell({ title, icon: Icon, href, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Icon className="w-4 h-4 text-amber-600" aria-hidden="true" />
          {title}
        </h3>
        {href && (
          <Link href={href} className="text-xs text-amber-600 hover:text-amber-500 flex items-center gap-1 min-h-11 px-1" aria-label={`View all ${title.toLowerCase()}`}>
            View <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium">{value}</span>
    </div>
  );
}

function WidgetLoader() {
  return (
    <div className="flex items-center justify-center py-6" role="status" aria-label="Loading">
      <Loader2 className="w-5 h-5 animate-spin text-slate-300" aria-hidden="true" />
    </div>
  );
}

// ─── Individual Widgets ─────────────────────────────────────────────────────

function JobsSummaryWidget() {
  const [stats, setStats] = useState<{ assigned: number; in_progress: number; completed: number; paid: number } | null>(null);

  useEffect(() => {
    offlineFetch('/api/contractor/jobs?limit=500')
      .then((r) => r.json())
      .then((d) => {
        const jobs = d.jobs ?? [];
        setStats({
          assigned: jobs.filter((j: { status: string }) => ['assigned', 'confirmed'].includes(j.status)).length,
          in_progress: jobs.filter((j: { status: string }) => j.status === 'in_progress').length,
          completed: jobs.filter((j: { status: string }) => ['completed', 'invoiced'].includes(j.status)).length,
          paid: jobs.filter((j: { status: string }) => j.status === 'paid').length,
        });
      })
      .catch(() => {});
  }, []);

  if (!stats) return <WidgetLoader />;

  return (
    <WidgetShell title="Job Status" icon={Briefcase} href="/dashboard/contractor/jobs">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Assigned', value: stats.assigned },
          { label: 'In Progress', value: stats.in_progress },
          { label: 'Completed', value: stats.completed },
          { label: 'Paid', value: stats.paid },
        ].map((s) => (
          <div key={s.label} className="bg-slate-50 rounded-lg p-2.5 text-center">
            <p className="text-xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}

function UpcomingJobsWidget() {
  const [jobs, setJobs] = useState<{ id: string; job_number: string; client_name: string; start_date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    offlineFetch(`/api/contractor/jobs?limit=5&start_after=${today}&sort=start_date`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title="Upcoming Jobs" icon={CalendarDays} href="/dashboard/contractor/jobs">
      {loading ? <WidgetLoader /> : jobs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No upcoming jobs</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <Link key={j.id} href={`/dashboard/contractor/jobs/${j.id}`} className="flex items-center justify-between text-sm hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2 transition">
              <div className="min-w-0">
                <span className="font-mono text-xs text-amber-600">{j.job_number}</span>
                <span className="text-slate-900 ml-2 truncate">{j.client_name}</span>
              </div>
              <span className="text-xs text-slate-400 shrink-0 ml-2">{new Date(j.start_date + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </Link>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

function RecentTimeWidget() {
  const [hours, setHours] = useState<{ st: number; ot: number; dt: number } | null>(null);

  useEffect(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    offlineFetch(`/api/contractor/time-entries?from=${weekAgo}`)
      .then((r) => r.json())
      .then((d) => {
        const entries = d.entries ?? d ?? [];
        let st = 0, ot = 0, dt = 0;
        for (const e of entries) {
          st += Number(e.st_hours ?? 0);
          ot += Number(e.ot_hours ?? 0);
          dt += Number(e.dt_hours ?? 0);
        }
        setHours({ st: Math.round(st * 10) / 10, ot: Math.round(ot * 10) / 10, dt: Math.round(dt * 10) / 10 });
      })
      .catch(() => setHours({ st: 0, ot: 0, dt: 0 }));
  }, []);

  if (!hours) return <WidgetLoader />;

  return (
    <WidgetShell title="This Week" icon={Clock} href="/dashboard/contractor/jobs">
      <div className="space-y-1.5">
        <StatRow label="Straight Time" value={`${hours.st}h`} />
        <StatRow label="Overtime" value={`${hours.ot}h`} />
        <StatRow label="Double Time" value={`${hours.dt}h`} />
        <div className="border-t border-slate-100 pt-1.5 mt-1.5">
          <StatRow label="Total" value={`${(hours.st + hours.ot + hours.dt).toFixed(1)}h`} />
        </div>
      </div>
    </WidgetShell>
  );
}

function FinanceSnapshotWidget() {
  const [data, setData] = useState<{ total_balance: number; accounts: number } | null>(null);

  useEffect(() => {
    offlineFetch('/api/finance/accounts')
      .then((r) => r.json())
      .then((d) => {
        const accounts = d.accounts ?? d ?? [];
        const total = accounts.reduce((sum: number, a: { current_balance?: number }) => sum + Number(a.current_balance ?? 0), 0);
        setData({ total_balance: total, accounts: accounts.length });
      })
      .catch(() => setData({ total_balance: 0, accounts: 0 }));
  }, []);

  if (!data) return <WidgetLoader />;

  return (
    <WidgetShell title="Finance" icon={DollarSign} href="/dashboard/contractor/finance">
      <div className="space-y-1.5">
        <div className="text-center py-2">
          <p className="text-2xl font-bold text-slate-900">${data.total_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500">across {data.accounts} account{data.accounts !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </WidgetShell>
  );
}

function EquipmentValueWidget() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    offlineFetch('/api/equipment/summary')
      .then((r) => r.json())
      .then((d) => setTotal(d.total_value ?? 0))
      .catch(() => setTotal(0));
  }, []);

  if (total === null) return <WidgetLoader />;

  return (
    <WidgetShell title="Equipment" icon={Wrench} href="/dashboard/contractor/equipment">
      <div className="text-center py-2">
        <p className="text-2xl font-bold text-slate-900">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        <p className="text-xs text-slate-500">total value</p>
      </div>
    </WidgetShell>
  );
}

// The Academy left Work.WitUS (2026-09-07); its enrollment API is gone. The widget id stays
// 'academy-progress' so saved dashboard layouts keep their slot.
function LearnWidget() {
  return (
    <WidgetShell title="Learn.WitUS" icon={GraduationCap}>
      <p className="text-sm text-slate-500">
        The Work.WitUS guides are free courses on Learn.WitUS, the WitUS home for courses.
      </p>
      <ul className="mt-2 space-y-0.5">
        {[LEARN_WITUS_GUIDES.contractor, LEARN_WITUS_GUIDES.finance, LEARN_WITUS_GUIDES.equipment].map((g) => (
          <li key={g.url}>
            <a
              href={g.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-sm text-amber-600 hover:text-amber-500 hover:underline"
            >
              {g.title}
              <span className="sr-only"> (opens Learn.WitUS in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      <a
        href={WORK_WITUS_GUIDES_SERIES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-500"
      >
        All seven guides <ArrowRight className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">(opens Learn.WitUS in a new tab)</span>
      </a>
    </WidgetShell>
  );
}

function InvoicesDueWidget() {
  const [data, setData] = useState<{ unpaid: number; overdue: number; total_owed: number } | null>(null);

  useEffect(() => {
    offlineFetch('/api/contractor/invoices?status=sent,overdue')
      .then((r) => r.json())
      .then((d) => {
        const invoices = d.invoices ?? d ?? [];
        const now = new Date();
        let unpaid = 0, overdue = 0, total = 0;
        for (const inv of invoices) {
          total += Number(inv.total_amount ?? inv.amount ?? 0);
          if (inv.due_date && new Date(inv.due_date) < now) overdue++;
          else unpaid++;
        }
        setData({ unpaid, overdue, total_owed: total });
      })
      .catch(() => setData({ unpaid: 0, overdue: 0, total_owed: 0 }));
  }, []);

  if (!data) return <WidgetLoader />;

  return (
    <WidgetShell title="Invoices Due" icon={FileText} href="/dashboard/contractor/invoices">
      <div className="space-y-1.5">
        <StatRow label="Unpaid" value={data.unpaid} />
        {data.overdue > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" aria-hidden="true" />
              Overdue
            </span>
            <span className="text-red-600 font-medium">{data.overdue}</span>
          </div>
        )}
        <div className="border-t border-slate-100 pt-1.5 mt-1.5">
          <StatRow label="Total Owed" value={`$${data.total_owed.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        </div>
      </div>
    </WidgetShell>
  );
}
