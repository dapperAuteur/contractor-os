'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, HardHat, ArrowRight, Loader2, X } from 'lucide-react';
import JobStatusBadge from '@/components/contractor/JobStatusBadge';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Job {
  id: string;
  job_number: string;
  client_name: string;
  event_name: string | null;
  location_name: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  pay_rate: number | null;
  est_pay_date: string | null;
}

interface StatCard {
  label: string;
  value: number;
  status: string;
  statuses: string[];
}

const STATUS_GROUPS: Record<string, { label: string; statuses: string[] }> = {
  assigned:    { label: 'Assigned',    statuses: ['assigned', 'confirmed'] },
  in_progress: { label: 'In Progress', statuses: ['in_progress'] },
  completed:   { label: 'Completed',   statuses: ['completed', 'invoiced'] },
  paid:        { label: 'Paid',        statuses: ['paid'] },
};

export default function ContractorHubPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    offlineFetch('/api/contractor/jobs?limit=100')
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .finally(() => setLoading(false));
  }, []);

  const stats: StatCard[] = Object.entries(STATUS_GROUPS).map(([key, { label, statuses }]) => ({
    label,
    value: jobs.filter((j) => statuses.includes(j.status)).length,
    status: key,
    statuses,
  }));

  const filteredJobs = activeFilter
    ? jobs.filter((j) => STATUS_GROUPS[activeFilter].statuses.includes(j.status))
    : jobs;

  const sectionTitle = activeFilter
    ? `${STATUS_GROUPS[activeFilter].label} Jobs`
    : 'All Jobs';

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardHat className="text-amber-400" size={28} aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-900">Work.WitUS</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/contractor/jobs/new"
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-amber-500 min-h-11"
            aria-label="Create new job"
          >
            <Plus size={16} aria-hidden="true" /> New Job
          </Link>
          <Link
            href="/dashboard/contractor/jobs"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 min-h-11"
            aria-label="View all jobs"
          >
            All Jobs <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Stats — clickable filter cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Filter jobs by status">
        {stats.map((s) => {
          const isActive = activeFilter === s.status;
          return (
            <button
              key={s.status}
              type="button"
              onClick={() => setActiveFilter(isActive ? null : s.status)}
              aria-pressed={isActive}
              className={`rounded-xl border p-4 text-center transition-all min-h-11 ${
                isActive
                  ? 'border-amber-500 bg-white ring-2 ring-amber-500/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-3xl font-bold text-slate-900">{s.value}</div>
              <div className="mt-1">
                <JobStatusBadge status={s.status} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtered Jobs */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{sectionTitle}</h2>
          {activeFilter && (
            <button
              type="button"
              onClick={() => setActiveFilter(null)}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 min-h-11"
              aria-label="Clear filter and show all jobs"
            >
              <X size={14} aria-hidden="true" /> Show All
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-slate-400" size={24} aria-label="Loading jobs" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            {activeFilter ? 'No jobs match this filter.' : 'No jobs yet.'}{' '}
            <Link href="/dashboard/contractor/jobs/new" className="text-amber-400 hover:underline">
              Create one
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredJobs.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/contractor/jobs/${job.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-amber-400">{job.job_number}</span>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <div className="mt-1 text-slate-900 font-medium truncate">
                    {job.client_name}
                    {job.event_name && <span className="text-slate-500"> — {job.event_name}</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {job.location_name && <span>{job.location_name} · </span>}
                    {job.start_date && <span>{new Date(job.start_date + 'T00:00').toLocaleDateString()}</span>}
                    {job.end_date && job.end_date !== job.start_date && (
                      <span> – {new Date(job.end_date + 'T00:00').toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
