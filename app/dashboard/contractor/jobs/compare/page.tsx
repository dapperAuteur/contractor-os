'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Copy } from 'lucide-react';
import JobStatusBadge from '@/components/contractor/JobStatusBadge';

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
  ot_rate: number | null;
  dt_rate: number | null;
  rate_type: string;
  union_local: string | null;
  department: string | null;
  poc_name: string | null;
  poc_phone: string | null;
  crew_coordinator_name: string | null;
  crew_coordinator_phone: string | null;
  benefits_eligible: boolean;
  travel_benefits: Record<string, number>;
  distance_from_home_miles: number | null;
  notes: string | null;
  is_multi_day: boolean;
  scheduled_dates: string[] | null;
}

interface RowDef {
  label: string;
  render: (job: Job) => React.ReactNode;
  getValue: (job: Job) => string;
}

const fmt = (n: number | null) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00').toLocaleDateString() : '—';

const ROWS: RowDef[] = [
  { label: 'Job #', render: (j) => <span className="font-mono text-amber-600">{j.job_number}</span>, getValue: (j) => j.job_number },
  { label: 'Status', render: (j) => <JobStatusBadge status={j.status} />, getValue: (j) => j.status },
  { label: 'Client', render: (j) => j.client_name || '—', getValue: (j) => j.client_name ?? '' },
  { label: 'Event', render: (j) => j.event_name || '—', getValue: (j) => j.event_name ?? '' },
  { label: 'Location', render: (j) => j.location_name || '—', getValue: (j) => j.location_name ?? '' },
  { label: 'Start Date', render: (j) => fmtDate(j.start_date), getValue: (j) => j.start_date ?? '' },
  { label: 'End Date', render: (j) => fmtDate(j.end_date), getValue: (j) => j.end_date ?? '' },
  { label: 'Multi-day', render: (j) => j.is_multi_day ? `Yes (${j.scheduled_dates?.length ?? 0} dates)` : 'No', getValue: (j) => j.is_multi_day ? 'yes' : 'no' },
  { label: 'ST Rate', render: (j) => fmt(j.pay_rate), getValue: (j) => String(j.pay_rate ?? '') },
  { label: 'OT Rate', render: (j) => fmt(j.ot_rate), getValue: (j) => String(j.ot_rate ?? '') },
  { label: 'DT Rate', render: (j) => fmt(j.dt_rate), getValue: (j) => String(j.dt_rate ?? '') },
  { label: 'Rate Type', render: (j) => j.rate_type || '—', getValue: (j) => j.rate_type ?? '' },
  { label: 'Union Local', render: (j) => j.union_local || '—', getValue: (j) => j.union_local ?? '' },
  { label: 'Department', render: (j) => j.department || '—', getValue: (j) => j.department ?? '' },
  { label: 'Benefits', render: (j) => j.benefits_eligible ? 'Yes' : 'No', getValue: (j) => j.benefits_eligible ? 'yes' : 'no' },
  { label: 'Distance (mi)', render: (j) => j.distance_from_home_miles != null ? String(j.distance_from_home_miles) : '—', getValue: (j) => String(j.distance_from_home_miles ?? '') },
  { label: 'POC', render: (j) => j.poc_name ? `${j.poc_name}${j.poc_phone ? ` · ${j.poc_phone}` : ''}` : '—', getValue: (j) => j.poc_name ?? '' },
  { label: 'Crew Coord.', render: (j) => j.crew_coordinator_name ? `${j.crew_coordinator_name}${j.crew_coordinator_phone ? ` · ${j.crew_coordinator_phone}` : ''}` : '—', getValue: (j) => j.crew_coordinator_name ?? '' },
  { label: 'Notes', render: (j) => j.notes || '—', getValue: (j) => j.notes ?? '' },
];

export default function CompareJobsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [jobs, setJobs] = useState<(Job | null)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean).slice(0, 4);
    if (ids.length < 2) { router.replace('/dashboard/contractor/jobs'); return; }

    Promise.all(
      ids.map((id) =>
        fetch(`/api/contractor/jobs/${id}`)
          .then((r) => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then((results) => {
      setJobs(results);
      setLoading(false);
    });
  }, [searchParams, router]);

  function handleDuplicate(job: Job) {
    const prefill = {
      client_name: job.client_name,
      event_name: job.event_name,
      location_name: job.location_name,
      poc_name: job.poc_name,
      poc_phone: job.poc_phone,
      crew_coordinator_name: job.crew_coordinator_name,
      crew_coordinator_phone: job.crew_coordinator_phone,
      pay_rate: job.pay_rate,
      ot_rate: job.ot_rate,
      dt_rate: job.dt_rate,
      rate_type: job.rate_type,
      union_local: job.union_local,
      department: job.department,
      benefits_eligible: job.benefits_eligible,
      travel_benefits: job.travel_benefits,
      distance_from_home_miles: job.distance_from_home_miles,
      notes: job.notes,
    };
    sessionStorage.setItem('duplicate_job_prefill', JSON.stringify(prefill));
    router.push('/dashboard/contractor/jobs/new?from=duplicate');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-400" size={32} aria-label="Loading jobs" />
      </div>
    );
  }

  const validJobs = jobs.filter((j): j is Job => j !== null);

  if (validJobs.length < 2) {
    return (
      <div className="p-8 text-center text-slate-400">
        Could not load jobs for comparison.{' '}
        <Link href="/dashboard/contractor/jobs" className="text-amber-600 hover:text-amber-500">Back to jobs</Link>
      </div>
    );
  }

  // For each row, check if all values are identical (only compare across valid jobs)
  function isDifferent(row: RowDef) {
    const values = validJobs.map((j) => row.getValue(j));
    return values.some((v) => v !== values[0]);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <Link
        href="/dashboard/contractor/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 min-h-11 py-2"
        aria-label="Back to Jobs"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Jobs
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Compare Jobs</h1>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="w-32 px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Field</th>
              {validJobs.map((job) => (
                <th key={job.id} className="px-4 py-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-amber-600">{job.job_number}</div>
                      <div className="text-xs text-slate-500 font-normal">{job.client_name}</div>
                    </div>
                    <button
                      onClick={() => handleDuplicate(job)}
                      className="shrink-0 flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 min-h-9"
                      aria-label={`Duplicate job ${job.job_number}`}
                      title="Duplicate this job"
                    >
                      <Copy size={12} aria-hidden="true" /> Dupe
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const diff = isDifferent(row);
              return (
                <tr
                  key={row.label}
                  className={`border-b border-slate-50 last:border-0 ${diff ? 'bg-amber-50/60' : ''}`}
                >
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">
                    {row.label}
                    {diff && <span className="ml-1 text-amber-500" aria-label="Values differ">•</span>}
                  </td>
                  {validJobs.map((job) => (
                    <td key={job.id} className={`px-4 py-2.5 text-slate-800 ${diff ? 'font-medium' : ''}`}>
                      {row.render(job)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1" aria-hidden="true" />
        Amber rows indicate fields where values differ between jobs.
      </p>
    </div>
  );
}
