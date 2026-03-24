'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Search, GitCompareArrows } from 'lucide-react';
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
  union_local: string | null;
  department: string | null;
}

const STATUSES = ['all', 'assigned', 'confirmed', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled'];

export default function JobsListPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (statusFilter !== 'all') params.set('status', statusFilter);

    offlineFetch(`/api/contractor/jobs?${params}`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = search
    ? jobs.filter(
        (j) =>
          j.job_number.toLowerCase().includes(search.toLowerCase()) ||
          j.client_name.toLowerCase().includes(search.toLowerCase()) ||
          j.event_name?.toLowerCase().includes(search.toLowerCase()) ||
          j.location_name?.toLowerCase().includes(search.toLowerCase()),
      )
    : jobs;

  function toggleCompareMode() {
    setCompareMode((v) => !v);
    setSelectedIds([]);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, id];
    });
  }

  function goCompare() {
    router.push(`/dashboard/contractor/jobs/compare?ids=${selectedIds.join(',')}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">All Jobs</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCompareMode}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium min-h-11 transition-colors ${
              compareMode
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            aria-label={compareMode ? 'Exit compare mode' : 'Enter compare mode'}
          >
            <GitCompareArrows size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{compareMode ? 'Cancel' : 'Compare'}</span>
          </button>
          <Link
            href="/dashboard/contractor/jobs/new"
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-amber-500 min-h-11"
            aria-label="Create new job"
          >
            <Plus size={16} aria-hidden="true" /> New Job
          </Link>
        </div>
      </div>

      {/* Compare selection bar */}
      {compareMode && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-sm text-amber-700">
            {selectedIds.length === 0
              ? 'Select 2–4 jobs to compare'
              : `${selectedIds.length} job${selectedIds.length !== 1 ? 's' : ''} selected${selectedIds.length >= 4 ? ' (max)' : ''}`}
          </span>
          <button
            onClick={goCompare}
            disabled={selectedIds.length < 2}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed min-h-11"
          >
            Compare Selected
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search jobs by number, client, event, or location"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 -mb-1"
          role="group"
          aria-label="Filter by job status"
          style={{ scrollbarWidth: 'none' }}
        >
          {STATUSES.map((s) => {
            const label = s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1);
            const active = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                aria-pressed={active}
                className={`shrink-0 min-h-11 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={24} aria-label="Loading jobs" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
          {search ? 'No jobs match your search.' : 'No jobs found.'}
        </div>
      ) : (
        <div className="space-y-2" role="list">
          {filtered.map((job) => {
            const isSelected = selectedIds.includes(job.id);
            const cardContent = (
              <div
                className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                  compareMode
                    ? isSelected
                      ? 'border-amber-400 bg-amber-50 cursor-pointer'
                      : 'border-slate-200 bg-white hover:border-amber-300 cursor-pointer'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
                onClick={compareMode ? () => toggleSelect(job.id) : undefined}
                role={compareMode ? 'checkbox' : undefined}
                aria-checked={compareMode ? isSelected : undefined}
                aria-label={compareMode ? `${isSelected ? 'Deselect' : 'Select'} job ${job.job_number} for comparison` : undefined}
              >
                {compareMode && (
                  <div className="mr-3 shrink-0">
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-300 bg-white'}`}>
                      {isSelected && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-amber-400">{job.job_number}</span>
                    <JobStatusBadge status={job.status} />
                    {job.union_local && (
                      <span className="text-xs text-slate-400">{job.union_local}</span>
                    )}
                    {job.department && (
                      <span className="text-xs text-slate-400">· {job.department}</span>
                    )}
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
                    {job.pay_rate && (
                      <span> · ${Number(job.pay_rate).toFixed(2)}/hr</span>
                    )}
                  </div>
                </div>
              </div>
            );

            return (
              <div key={job.id} role="listitem">
                {compareMode ? (
                  cardContent
                ) : (
                  <Link href={`/dashboard/contractor/jobs/${job.id}`} className="block">
                    {cardContent}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
