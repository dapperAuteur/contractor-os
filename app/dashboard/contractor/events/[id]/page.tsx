'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, MapPin, Clock, DollarSign, Plus,
  Trash2, Calendar, Users, RefreshCw,
} from 'lucide-react';
import JobStatusBadge from '@/components/contractor/JobStatusBadge';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface EventJob {
  id: string;
  job_number: string;
  client_name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  pay_rate: number | null;
  event_name: string | null;
}

interface EventDetail {
  id: string;
  name: string;
  client_name: string | null;
  location_name: string | null;
  poc_name: string | null;
  poc_phone: string | null;
  crew_coordinator_name: string | null;
  crew_coordinator_phone: string | null;
  start_date: string | null;
  end_date: string | null;
  union_local: string | null;
  department: string | null;
  pay_rate: number | null;
  ot_rate: number | null;
  dt_rate: number | null;
  rate_type: string;
  benefits_eligible: boolean;
  travel_benefits: Record<string, number>;
  notes: string | null;
  _jobs: EventJob[];
  _stats: {
    total_jobs: number;
    total_hours: number;
    total_invoiced: number;
  };
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadEvent = useCallback(async () => {
    const res = await offlineFetch(`/api/contractor/events/${id}`);
    const data = await res.json();
    if (res.ok) setEvent(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  async function handleDelete() {
    if (!confirm('Delete this event? Linked jobs will be preserved but unlinked.')) return;
    setDeleting(true);
    const res = await offlineFetch(`/api/contractor/events/${id}`, { method: 'DELETE' });
    setDeleting(false);
    if (res.ok) router.push('/dashboard/contractor/events');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24" role="status">
        <Loader2 className="animate-spin text-slate-400" size={32} aria-hidden="true" />
        <span className="sr-only">Loading event</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center text-slate-400">
        Event not found. <Link href="/dashboard/contractor/events" className="text-amber-600">Go back</Link>
      </div>
    );
  }

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <Link href="/dashboard/contractor/events" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 min-h-11 py-2" aria-label="Back to Events">
        <ArrowLeft size={14} aria-hidden="true" /> Events
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{event.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
            {event.client_name && <span>{event.client_name}</span>}
            {event.location_name && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} aria-hidden="true" /> {event.location_name}
              </span>
            )}
            {event.start_date && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} aria-hidden="true" />
                {new Date(event.start_date + 'T00:00').toLocaleDateString()}
                {event.end_date && event.end_date !== event.start_date && (
                  <> – {new Date(event.end_date + 'T00:00').toLocaleDateString()}</>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/contractor/jobs/new?event_id=${id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 min-h-11"
          >
            <Plus size={14} aria-hidden="true" /> Add Job
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 min-h-11"
            aria-label={deleting ? 'Deleting event...' : 'Delete event'}
          >
            {deleting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <Users size={18} className="mx-auto text-slate-400 mb-1" aria-hidden="true" />
          <div className="text-lg font-bold text-slate-900">{event._stats.total_jobs}</div>
          <div className="text-xs text-slate-500">Jobs</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <Clock size={18} className="mx-auto text-slate-400 mb-1" aria-hidden="true" />
          <div className="text-lg font-bold text-slate-900">{event._stats.total_hours}</div>
          <div className="text-xs text-slate-500">Hours</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <DollarSign size={18} className="mx-auto text-slate-400 mb-1" aria-hidden="true" />
          <div className="text-lg font-bold text-slate-900">{fmt(event._stats.total_invoiced)}</div>
          <div className="text-xs text-slate-500">Invoiced</div>
        </div>
      </div>

      {/* Event Details */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Event Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 text-sm">
          {event.pay_rate && <div><dt className="text-slate-500">ST Rate</dt><dd className="font-medium text-slate-900">{fmt(event.pay_rate)}</dd></div>}
          {event.ot_rate && <div><dt className="text-slate-500">OT Rate</dt><dd className="font-medium text-slate-900">{fmt(event.ot_rate)}</dd></div>}
          {event.dt_rate && <div><dt className="text-slate-500">DT Rate</dt><dd className="font-medium text-slate-900">{fmt(event.dt_rate)}</dd></div>}
          <div><dt className="text-slate-500">Rate Type</dt><dd className="font-medium text-slate-900 capitalize">{event.rate_type}</dd></div>
          {event.union_local && <div><dt className="text-slate-500">Union Local</dt><dd className="font-medium text-slate-900">{event.union_local}</dd></div>}
          {event.department && <div><dt className="text-slate-500">Department</dt><dd className="font-medium text-slate-900">{event.department}</dd></div>}
          {event.poc_name && <div><dt className="text-slate-500">POC</dt><dd className="font-medium text-slate-900">{event.poc_name}{event.poc_phone && <span className="text-slate-500 ml-1">{event.poc_phone}</span>}</dd></div>}
          {event.crew_coordinator_name && <div><dt className="text-slate-500">Coordinator</dt><dd className="font-medium text-slate-900">{event.crew_coordinator_name}{event.crew_coordinator_phone && <span className="text-slate-500 ml-1">{event.crew_coordinator_phone}</span>}</dd></div>}
        </dl>
        {event.notes && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{event.notes}</p>
          </div>
        )}
      </div>

      {/* Linked Jobs */}
      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">
          Linked Jobs ({event._jobs.length})
        </h2>
        {event._jobs.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-slate-300">
            <p className="text-sm text-slate-400">No jobs linked to this event yet.</p>
            <Link
              href={`/dashboard/contractor/jobs/new?event_id=${id}`}
              className="inline-flex items-center gap-1 text-sm text-amber-600 hover:underline mt-2 min-h-11 py-2"
            >
              <Plus size={12} aria-hidden="true" /> Create the first job
            </Link>
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="Linked jobs">
            {event._jobs.map((job) => (
              <Link
                role="listitem"
                key={job.id}
                href={`/dashboard/contractor/jobs/${job.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-amber-600">{job.job_number}</span>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {job.start_date && new Date(job.start_date + 'T00:00').toLocaleDateString()}
                    {job.pay_rate && <span className="ml-2">{fmt(job.pay_rate)}/hr</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
