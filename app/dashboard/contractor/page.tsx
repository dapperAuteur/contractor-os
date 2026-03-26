'use client';

// app/dashboard/contractor/page.tsx
// Contractor dashboard with customizable widget grid.
// Users can show/hide and reorder widgets. Preferences stored in DB.

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, HardHat, ArrowRight, Loader2, Settings2, X, GripVertical, Eye, EyeOff } from 'lucide-react';
import JobStatusBadge from '@/components/contractor/JobStatusBadge';
import { WIDGET_REGISTRY, type WidgetDef } from '@/components/dashboard/widgets';
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

interface WidgetPref {
  id: string;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetPref[] = [
  { id: 'jobs-summary', visible: true, order: 0 },
  { id: 'upcoming-jobs', visible: true, order: 1 },
  { id: 'recent-time', visible: true, order: 2 },
  { id: 'invoices-due', visible: true, order: 3 },
  { id: 'finance-snapshot', visible: false, order: 4 },
  { id: 'travel-summary', visible: false, order: 5 },
  { id: 'equipment-value', visible: false, order: 6 },
  { id: 'academy-progress', visible: false, order: 7 },
];

export default function ContractorHubPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(DEFAULT_WIDGETS);
  const [customizing, setCustomizing] = useState(false);
  const [savingWidgets, setSavingWidgets] = useState(false);

  useEffect(() => {
    offlineFetch('/api/contractor/jobs?limit=100')
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .finally(() => setLoading(false));
  }, []);

  // Load widget preferences
  useEffect(() => {
    offlineFetch('/api/user/widgets')
      .then((r) => r.json())
      .then((d) => {
        const saved = d.widgets;
        if (Array.isArray(saved) && saved.length > 0) {
          // Merge saved prefs with registry (handle new widgets added after save)
          const savedIds = new Set(saved.map((w: WidgetPref) => w.id));
          const merged = [
            ...saved,
            ...DEFAULT_WIDGETS.filter((dw) => !savedIds.has(dw.id)).map((dw, i) => ({ ...dw, order: saved.length + i })),
          ];
          setWidgetPrefs(merged);
        }
      })
      .catch(() => {});
  }, []);

  const saveWidgetPrefs = useCallback(async (prefs: WidgetPref[]) => {
    setSavingWidgets(true);
    await offlineFetch('/api/user/widgets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgets: prefs }),
    });
    setSavingWidgets(false);
  }, []);

  const toggleWidget = (id: string) => {
    const updated = widgetPrefs.map((w) => w.id === id ? { ...w, visible: !w.visible } : w);
    setWidgetPrefs(updated);
    saveWidgetPrefs(updated);
  };

  const moveWidget = (id: string, direction: -1 | 1) => {
    const sorted = [...widgetPrefs].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((w) => w.id === id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const temp = sorted[idx].order;
    sorted[idx].order = sorted[swapIdx].order;
    sorted[swapIdx].order = temp;

    const updated = widgetPrefs.map((w) => {
      const match = sorted.find((s) => s.id === w.id);
      return match ? { ...w, order: match.order } : w;
    });
    setWidgetPrefs(updated);
    saveWidgetPrefs(updated);
  };

  const visibleWidgets = widgetPrefs
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order)
    .map((pref) => WIDGET_REGISTRY.find((wr) => wr.id === pref.id))
    .filter(Boolean) as WidgetDef[];

  const STATUS_GROUPS: Record<string, { label: string; statuses: string[] }> = {
    assigned:    { label: 'Assigned',    statuses: ['assigned', 'confirmed'] },
    in_progress: { label: 'In Progress', statuses: ['in_progress'] },
    completed:   { label: 'Completed',   statuses: ['completed', 'invoiced'] },
    paid:        { label: 'Paid',        statuses: ['paid'] },
  };

  const filteredJobs = activeFilter
    ? jobs.filter((j) => STATUS_GROUPS[activeFilter].statuses.includes(j.status))
    : jobs;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <HardHat className="text-amber-400" size={28} aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-900">Work.WitUS</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCustomizing(!customizing)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium min-h-11 transition ${
              customizing ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
            aria-label={customizing ? 'Done customizing' : 'Customize dashboard'}
            aria-expanded={customizing}
          >
            {customizing ? <X size={16} aria-hidden="true" /> : <Settings2 size={16} aria-hidden="true" />}
            {customizing ? 'Done' : 'Customize'}
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

      {/* Widget Customizer */}
      {customizing && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5" role="region" aria-label="Widget settings">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Dashboard Widgets</h2>
          <p className="text-xs text-slate-400 mb-4">Toggle visibility and reorder your dashboard widgets.</p>
          <div className="space-y-1.5">
            {[...widgetPrefs].sort((a, b) => a.order - b.order).map((pref) => {
              const def = WIDGET_REGISTRY.find((w) => w.id === pref.id);
              if (!def) return null;
              const Icon = def.icon;
              return (
                <div key={pref.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveWidget(pref.id, -1)}
                      className="text-slate-400 hover:text-slate-600 transition p-0.5"
                      aria-label={`Move ${def.label} up`}
                    >
                      <GripVertical className="w-3 h-3 rotate-180" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => moveWidget(pref.id, 1)}
                      className="text-slate-400 hover:text-slate-600 transition p-0.5"
                      aria-label={`Move ${def.label} down`}
                    >
                      <GripVertical className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                  <Icon className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{def.label}</p>
                    <p className="text-xs text-slate-400">{def.description}</p>
                  </div>
                  <button
                    onClick={() => toggleWidget(pref.id)}
                    className={`flex items-center justify-center min-h-11 min-w-11 p-2 rounded-lg transition ${
                      pref.visible ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100'
                    }`}
                    aria-label={pref.visible ? `Hide ${def.label}` : `Show ${def.label}`}
                    aria-pressed={pref.visible}
                  >
                    {pref.visible ? <Eye className="w-4 h-4" aria-hidden="true" /> : <EyeOff className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              );
            })}
          </div>
          {savingWidgets && <p className="text-xs text-slate-400 mt-2">Saving...</p>}
        </div>
      )}

      {/* Widget Grid */}
      {visibleWidgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleWidgets.map((w) => {
            const Component = w.component;
            return <Component key={w.id} />;
          })}
        </div>
      )}

      {/* Jobs List (always visible below widgets) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {activeFilter ? `${STATUS_GROUPS[activeFilter].label} Jobs` : 'Recent Jobs'}
          </h2>
          <div className="flex items-center gap-2">
            {activeFilter && (
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 min-h-11"
                aria-label="Clear filter"
              >
                <X size={14} aria-hidden="true" /> Clear
              </button>
            )}
            <Link
              href="/dashboard/contractor/jobs"
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-500 min-h-11 px-1"
            >
              All Jobs <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Filter by status">
          {Object.entries(STATUS_GROUPS).map(([key, { label }]) => {
            const count = jobs.filter((j) => STATUS_GROUPS[key].statuses.includes(j.status)).length;
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(isActive ? null : key)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition min-h-11 ${
                  isActive
                    ? 'bg-amber-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
                <span className={`${isActive ? 'text-amber-200' : 'text-slate-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-12" role="status" aria-label="Loading jobs">
            <Loader2 className="animate-spin text-slate-400" size={24} aria-hidden="true" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            {activeFilter ? 'No jobs match this filter.' : 'No jobs yet.'}{' '}
            <Link href="/dashboard/contractor/jobs/new" className="text-amber-600 hover:underline">
              Create one
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredJobs.slice(0, 10).map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/contractor/jobs/${job.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-amber-600">{job.job_number}</span>
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
            {filteredJobs.length > 10 && (
              <Link
                href="/dashboard/contractor/jobs"
                className="block text-center text-sm text-amber-600 hover:text-amber-500 py-3"
              >
                View all {filteredJobs.length} jobs
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
