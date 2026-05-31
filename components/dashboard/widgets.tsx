'use client';

// components/dashboard/widgets.tsx
// Widget registry and individual widget components for the customizable dashboard.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, Clock, DollarSign, Car, Wrench, GraduationCap, FileText,
  ArrowRight, Loader2, TrendingUp, CalendarDays,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

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
  { id: 'travel-summary', label: 'Travel', description: 'Miles and trips this month', icon: Car, component: TravelSummaryWidget, paid: true },
  { id: 'equipment-value', label: 'Equipment', description: 'Total equipment value', icon: Wrench, component: EquipmentValueWidget, paid: true },
  { id: 'academy-progress', label: 'Academy', description: 'Enrolled courses and progress', icon: GraduationCap, component: AcademyProgressWidget },
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

function TravelSummaryWidget() {
  const [data, setData] = useState<{ trips: number; miles: number } | null>(null);

  useEffect(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    offlineFetch(`/api/travel/trips?from=${monthStart}`)
      .then((r) => r.json())
      .then((d) => {
        const trips = d.trips ?? d ?? [];
        const miles = trips.reduce((sum: number, t: { distance_miles?: number }) => sum + Number(t.distance_miles ?? 0), 0);
        setData({ trips: trips.length, miles: Math.round(miles) });
      })
      .catch(() => setData({ trips: 0, miles: 0 }));
  }, []);

  if (!data) return <WidgetLoader />;

  return (
    <WidgetShell title="Travel This Month" icon={Car} href="/dashboard/contractor/travel">
      <div className="space-y-1.5">
        <StatRow label="Trips" value={data.trips} />
        <StatRow label="Miles" value={data.miles.toLocaleString()} />
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

function AcademyProgressWidget() {
  const [data, setData] = useState<{ enrolled: number; completed: number } | null>(null);

  useEffect(() => {
    offlineFetch('/api/academy/my-courses')
      .then((r) => r.json())
      .then((d) => {
        const courses = d.courses ?? d ?? [];
        setData({
          enrolled: courses.length,
          completed: courses.filter((c: { completion_pct?: number }) => (c.completion_pct ?? 0) >= 100).length,
        });
      })
      .catch(() => setData({ enrolled: 0, completed: 0 }));
  }, []);

  if (!data) return <WidgetLoader />;

  return (
    <WidgetShell title="Academy" icon={GraduationCap} href="/academy/my-courses">
      <div className="space-y-1.5">
        <StatRow label="Enrolled" value={data.enrolled} />
        <StatRow label="Completed" value={data.completed} />
        {data.enrolled > 0 && (
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${data.enrolled > 0 ? Math.round((data.completed / data.enrolled) * 100) : 0}%` }}
            />
          </div>
        )}
      </div>
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
