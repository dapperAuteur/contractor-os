'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, UserPlus, ChevronDown, X as XIcon,
  AlertTriangle, Briefcase,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Assignment {
  id: string;
  job_id: string;
  assigned_to: string;
  status: string;
  message: string | null;
  response_note: string | null;
  assigned_at: string;
  responded_at: string | null;
  job: { job_number: string; client_name: string; event_name: string | null; start_date: string | null; location_name: string | null } | null;
  assigned_to_username: string;
}

interface Job {
  id: string;
  job_number: string;
  client_name: string;
  event_name: string | null;
}

interface RosterContact {
  id: string;
  name: string;
  linked_user_id: string | null;
  username: string | null;
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  offered: { color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  accepted: { color: 'text-green-400', bg: 'bg-green-400/10' },
  declined: { color: 'text-red-400', bg: 'bg-red-400/10' },
  removed: { color: 'text-slate-400', bg: 'bg-slate-200/50' },
};

export default function ListerAssignPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [roster, setRoster] = useState<RosterContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [form, setForm] = useState({ job_id: '', assigned_to: '', message: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [aRes, jRes, rRes] = await Promise.all([
      offlineFetch('/api/contractor/assignments?role=lister').then((r) => r.json()),
      offlineFetch('/api/contractor/jobs?status=assigned,confirmed,in_progress').then((r) => r.json()),
      offlineFetch('/api/contractor/roster').then((r) => r.json()),
    ]);
    setAssignments(aRes.assignments ?? []);
    setJobs(jRes.jobs ?? []);
    setRoster(rRes.roster ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createAssignment() {
    if (!form.job_id || !form.assigned_to) return;
    setAssigning(true);
    const res = await offlineFetch('/api/contractor/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setAssigning(false);
    if (res.ok) {
      setShowAssign(false);
      setForm({ job_id: '', assigned_to: '', message: '' });
      load();
    }
  }

  async function removeAssignment(id: string) {
    setRemovingId(id);
    await offlineFetch(`/api/contractor/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'removed' }),
    });
    setRemovingId(null);
    load();
  }

  const filtered = statusFilter
    ? assignments.filter((a) => a.status === statusFilter)
    : assignments;

  // Roster contacts with linked_user_id (can be assigned)
  const assignableContacts = roster.filter((c) => c.linked_user_id);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
        <button
          onClick={() => setShowAssign(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white"
        >
          <UserPlus size={14} aria-hidden="true" /> Assign Contractor
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 flex-wrap" role="group" aria-label="Filter by status">
        {['', 'offered', 'accepted', 'declined', 'removed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Assign form */}
      {showAssign && (
        <div className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Assign Contractor to Job</h2>
            <button onClick={() => setShowAssign(false)} className="min-h-11 min-w-11 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Close">
              <XIcon size={18} aria-hidden="true" />
            </button>
          </div>

          {assignableContacts.length === 0 && (
            <div className="rounded-lg border border-yellow-700/50 bg-yellow-900/20 p-3 flex gap-2" role="alert">
              <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-yellow-300">No assignable contractors. Add contractors with linked accounts to your roster first.</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Job *</span>
              <div className="relative mt-1">
                <select
                  value={form.job_id}
                  onChange={(e) => setForm({ ...form, job_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 pr-8 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 appearance-none"
                >
                  <option value="">Select a job...</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.job_number} — {j.event_name || j.client_name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-500">Contractor *</span>
              <div className="relative mt-1">
                <select
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 pr-8 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 appearance-none"
                >
                  <option value="">Select contractor...</option>
                  {assignableContacts.map((c) => (
                    <option key={c.id} value={c.linked_user_id!}>{c.name}{c.username ? ` (@${c.username})` : ''}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
              </div>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-500">Message (optional)</span>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
              placeholder="Hey, we need a camera op for the B1G tournament..."
            />
          </label>

          <div className="flex gap-2 pt-1">
            <button onClick={createAssignment} disabled={assigning || !form.job_id || !form.assigned_to}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white">
              {assigning ? <Loader2 size={14} className="animate-spin" aria-label="Loading..." /> : <UserPlus size={14} aria-hidden="true" />}
              {assigning ? 'Assigning...' : 'Assign'}
            </button>
            <button onClick={() => setShowAssign(false)}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-11">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Assignments list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-slate-400" size={24} aria-label="Loading..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
          {statusFilter ? `No ${statusFilter} assignments.` : 'No assignments yet. Assign contractors to jobs to get started.'}
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label="Assignments">
          {filtered.map((a) => {
            const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.offered;
            return (
              <article key={a.id} role="listitem" className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Briefcase size={14} className="text-indigo-400 shrink-0" aria-hidden="true" />
                      <span className="text-sm font-medium text-slate-900">
                        {a.job?.event_name || a.job?.client_name || 'Unknown Job'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.color} ${style.bg}`}>
                        {a.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400 flex flex-wrap gap-x-3">
                      <span>To: {a.assigned_to_username}</span>
                      {a.job?.start_date && <span>· {new Date(a.job.start_date + 'T00:00:00').toLocaleDateString()}</span>}
                      {a.job?.location_name && <span>· {a.job.location_name}</span>}
                      <span>· Sent {new Date(a.assigned_at).toLocaleDateString()}</span>
                    </div>
                    {a.message && <p className="mt-1 text-xs text-slate-500 italic">&ldquo;{a.message}&rdquo;</p>}
                    {a.response_note && (
                      <p className="mt-1 text-xs text-slate-500">
                        <span className="text-slate-400">Response:</span> {a.response_note}
                      </p>
                    )}
                  </div>

                  {(a.status === 'offered' || a.status === 'accepted') && (
                    <button
                      onClick={() => removeAssignment(a.id)}
                      disabled={removingId === a.id}
                      className="min-h-11 min-w-11 flex items-center justify-center rounded text-slate-400 hover:text-red-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label={`Remove assignment for ${a.assigned_to_username}`}
                    >
                      {removingId === a.id ? <Loader2 size={14} className="animate-spin" aria-label="Loading..." /> : <XIcon size={14} aria-hidden="true" />}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400">{filtered.length} assignment{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
