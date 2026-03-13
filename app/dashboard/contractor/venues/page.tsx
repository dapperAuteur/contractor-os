'use client';

// app/dashboard/contractor/venues/page.tsx
// Two tabs:
//   "Public Library" — community venue database; add venues; request edits/deletes
//   "My Venues"      — venues from user's own jobs (existing behaviour)

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, MapPin, Building2, ChevronDown, ChevronUp, Save, X, ExternalLink,
  FileImage, Plus, Edit2, Trash2, Search,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';
import Modal from '@/components/ui/Modal';

/* ─── Types ─── */
interface KnowledgeBase {
  parking?: string;
  load_in?: string;
  wifi?: string;
  power?: string;
  catering?: string;
  security?: string;
  custom?: { key: string; value: string }[];
}

interface PublicVenue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  venue_type: string | null;
  capacity: number | null;
  notes: string | null;
  knowledge_base: KnowledgeBase;
  schematics_url: string | null;
  created_by: string | null;
}

interface MyVenue {
  id: string;
  label: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  schematics_url: string | null;
  knowledge_base: KnowledgeBase;
  job_count: number;
}

const KB_FIELDS: { key: keyof Omit<KnowledgeBase, 'custom'>; label: string }[] = [
  { key: 'parking', label: 'Parking' },
  { key: 'load_in', label: 'Load-in / Dock' },
  { key: 'wifi', label: 'WiFi' },
  { key: 'power', label: 'Power' },
  { key: 'catering', label: 'Catering' },
  { key: 'security', label: 'Security / Check-in' },
];

const VENUE_TYPES = [
  'Stage', 'Studio', 'Arena', 'Theater', 'Amphitheater',
  'Convention Center', 'Fairgrounds', 'Outdoor', 'Club', 'Other',
];

const emptyKb = (): KnowledgeBase => ({});

/* ─── Add Venue Modal ─── */
function AddVenueModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', venue_type: '',
    capacity: '', notes: '',
  });
  const [kb, setKb] = useState<KnowledgeBase>(emptyKb());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateKbField(key: keyof Omit<KnowledgeBase, 'custom'>, value: string) {
    setKb((prev) => ({ ...prev, [key]: value || undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await offlineFetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          capacity: form.capacity ? Number(form.capacity) : null,
          knowledge_base: kb,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to add venue');
      }
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

  return (
    <Modal isOpen onClose={onClose} title="Add Venue to Library" size="sm">
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Venue Name *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hollywood Bowl" required />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.venue_type} onChange={(e) => setForm({ ...form, venue_type: e.target.value })}>
                <option value="">Select type…</option>
                {VENUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Capacity</label>
              <input type="number" min="0" className={inputCls} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="17,500" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="2301 N Highland Ave" />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Los Angeles" />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input className={inputCls} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="CA" maxLength={2} />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Knowledge Base</legend>
            {KB_FIELDS.map((f) => (
              <div key={f.key}>
                <label className={labelCls}>{f.label}</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={kb[f.key] ?? ''} onChange={(e) => updateKbField(f.key, e.target.value)} placeholder={`${f.label} details…`} />
              </div>
            ))}
          </fieldset>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} className={`${inputCls} resize-none`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any other useful info…" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
            <button type="submit" disabled={saving || !form.name.trim()} className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60 transition">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Add Venue
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ─── Request Change Modal ─── */
function RequestChangeModal({
  venue,
  type,
  onClose,
  onSubmitted,
}: {
  venue: PublicVenue;
  type: 'edit' | 'delete';
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [reason, setReason] = useState('');
  const [editForm, setEditForm] = useState<Partial<PublicVenue>>({
    name: venue.name,
    address: venue.address ?? '',
    city: venue.city ?? '',
    state: venue.state ?? '',
    venue_type: venue.venue_type ?? '',
    capacity: venue.capacity ?? undefined,
    notes: venue.notes ?? '',
  });
  const [kb, setKb] = useState<KnowledgeBase>(venue.knowledge_base ?? emptyKb());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateKbField(key: keyof Omit<KnowledgeBase, 'custom'>, value: string) {
    setKb((prev) => ({ ...prev, [key]: value || undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await offlineFetch(`/api/venues/${venue.id}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: type,
          proposed_changes: type === 'edit' ? { ...editForm, knowledge_base: kb } : null,
          reason: reason.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to submit request');
      }
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

  return (
    <Modal isOpen onClose={onClose} title={type === 'delete' ? 'Request Deletion' : 'Request Edit'} size="sm">
      <div className="p-6">
        {type === 'delete' && (
          <p className="text-sm text-slate-600 mb-4">
            You&apos;re requesting that <strong>{venue.name}</strong> be removed from the public library. An admin will review this request.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'edit' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Venue Name</label>
                  <input className={inputCls} value={editForm.name ?? ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select className={inputCls} value={editForm.venue_type ?? ''} onChange={(e) => setEditForm({ ...editForm, venue_type: e.target.value })}>
                    <option value="">Select type…</option>
                    {VENUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Capacity</label>
                  <input type="number" min="0" className={inputCls} value={editForm.capacity ?? ''} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Address</label>
                  <input className={inputCls} value={editForm.address ?? ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input className={inputCls} value={editForm.city ?? ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input className={inputCls} value={editForm.state ?? ''} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} maxLength={2} />
                </div>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Knowledge Base</legend>
                {KB_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className={labelCls}>{f.label}</label>
                    <textarea rows={2} className={`${inputCls} resize-none`} value={kb[f.key] ?? ''} onChange={(e) => updateKbField(f.key, e.target.value)} />
                  </div>
                ))}
              </fieldset>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={editForm.notes ?? ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
            </>
          )}

          <div>
            <label className={labelCls}>Reason (optional)</label>
            <textarea rows={2} className={`${inputCls} resize-none`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you requesting this change?" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 transition text-white ${type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {type === 'delete' ? 'Request Deletion' : 'Submit Edit Request'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ─── Public Library Tab ─── */
function PublicLibraryTab() {
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [requestTarget, setRequestTarget] = useState<{ venue: PublicVenue; type: 'edit' | 'delete' } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback((q = '') => {
    setLoading(true);
    offlineFetch(`/api/venues${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      .then((r) => r.json())
      .then((d) => setVenues(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by name or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            aria-label="Search public venues"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition min-h-11"
        >
          <Plus size={14} aria-hidden="true" /> Add Venue
        </button>
      </div>

      {successMsg && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2" role="status">{successMsg}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-slate-400" size={24} aria-label="Loading…" />
        </div>
      ) : venues.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
          {search ? 'No venues match your search.' : 'No venues in the library yet. Be the first to add one!'}
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Public venue library">
          {venues.map((venue) => {
            const isExpanded = expandedId === venue.id;
            const kb = venue.knowledge_base ?? {};
            const hasKb = KB_FIELDS.some((f) => kb[f.key]) || (kb.custom?.length ?? 0) > 0;
            return (
              <article key={venue.id} role="listitem" className="rounded-xl border border-slate-200 bg-white">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : venue.id)}
                  className="flex w-full items-center justify-between p-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 rounded-xl"
                  aria-expanded={isExpanded}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 size={16} className="text-amber-600 shrink-0" aria-hidden="true" />
                      <span className="font-medium text-slate-900">{venue.name}</span>
                      {venue.venue_type && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{venue.venue_type}</span>
                      )}
                      {hasKb && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">KB</span>
                      )}
                    </div>
                    {(venue.city || venue.address) && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin size={11} aria-hidden="true" />
                        {[venue.address, venue.city, venue.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-slate-400 shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400 shrink-0" aria-hidden="true" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 space-y-4">
                    {venue.schematics_url && (
                      <a href={venue.schematics_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded">
                        <FileImage size={14} aria-hidden="true" /> View Schematics <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    )}

                    {hasKb ? (
                      <dl className="space-y-2">
                        {KB_FIELDS.map((f) => kb[f.key] && (
                          <div key={f.key}>
                            <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">{kb[f.key]}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-sm text-slate-400">No knowledge base info yet.</p>
                    )}

                    {venue.capacity && (
                      <p className="text-xs text-slate-500">Capacity: {venue.capacity.toLocaleString()}</p>
                    )}
                    {venue.notes && (
                      <p className="text-sm text-slate-600">{venue.notes}</p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setRequestTarget({ venue, type: 'edit' })}
                        className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition min-h-11"
                      >
                        <Edit2 size={12} aria-hidden="true" /> Request Edit
                      </button>
                      <button
                        onClick={() => setRequestTarget({ venue, type: 'delete' })}
                        className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition min-h-11"
                      >
                        <Trash2 size={12} aria-hidden="true" /> Request Deletion
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddVenueModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { load(search); showSuccess('Venue added to the library!'); }}
        />
      )}

      {requestTarget && (
        <RequestChangeModal
          venue={requestTarget.venue}
          type={requestTarget.type}
          onClose={() => setRequestTarget(null)}
          onSubmitted={() => showSuccess('Change request submitted — an admin will review it shortly.')}
        />
      )}
    </div>
  );
}

/* ─── My Venues Tab (existing behaviour) ─── */
function MyVenuesTab() {
  const [venues, setVenues] = useState<MyVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKb, setEditKb] = useState<KnowledgeBase>({});
  const [editSchematics, setEditSchematics] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    offlineFetch('/api/contractor/venues')
      .then((r) => r.json())
      .then((d) => setVenues(d.venues ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(venue: MyVenue) {
    setEditingId(venue.id);
    setEditKb(venue.knowledge_base ?? {});
    setEditSchematics(venue.schematics_url ?? '');
  }

  async function saveKb(venueId: string) {
    setSaving(true);
    const res = await offlineFetch('/api/contractor/venues', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location_id: venueId, knowledge_base: editKb, schematics_url: editSchematics.trim() || null }),
    });
    setSaving(false);
    if (res.ok) { setEditingId(null); load(); }
  }

  function updateKbField(key: keyof Omit<KnowledgeBase, 'custom'>, value: string) {
    setEditKb((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function addCustomField() {
    setEditKb((prev) => ({ ...prev, custom: [...(prev.custom ?? []), { key: '', value: '' }] }));
  }

  function updateCustomField(index: number, field: 'key' | 'value', val: string) {
    setEditKb((prev) => {
      const custom = [...(prev.custom ?? [])];
      custom[index] = { ...custom[index], [field]: val };
      return { ...prev, custom };
    });
  }

  function removeCustomField(index: number) {
    setEditKb((prev) => ({ ...prev, custom: (prev.custom ?? []).filter((_, i) => i !== index) }));
  }

  const filtered = search
    ? venues.filter((v) => v.label.toLowerCase().includes(search.toLowerCase()) || v.address?.toLowerCase().includes(search.toLowerCase()))
    : venues;

  const inputCls = 'mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search your venues…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        aria-label="Search my venues"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-slate-400" size={24} aria-label="Loading…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
          {search ? 'No venues match your search.' : 'No venues yet. Venues appear here when you add locations to jobs.'}
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="My venues">
          {filtered.map((venue) => {
            const isExpanded = expandedId === venue.id;
            const isEditing = editingId === venue.id;
            const kb = venue.knowledge_base ?? {};
            const hasKb = KB_FIELDS.some((f) => kb[f.key]) || (kb.custom?.length ?? 0) > 0;
            return (
              <article key={venue.id} role="listitem" className="rounded-xl border border-slate-200 bg-white">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : venue.id)}
                  className="flex w-full items-center justify-between p-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 rounded-xl"
                  aria-expanded={isExpanded}
                  aria-label={`${venue.label} — ${venue.job_count} job${venue.job_count !== 1 ? 's' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 size={16} className="text-amber-600 shrink-0" aria-hidden="true" />
                      <span className="font-medium text-slate-900">{venue.label}</span>
                      <span className="text-xs text-slate-400">{venue.job_count} job{venue.job_count !== 1 ? 's' : ''}</span>
                      {hasKb && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">KB</span>}
                    </div>
                    {venue.address && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin size={11} aria-hidden="true" /> {venue.address}
                      </div>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400 shrink-0" aria-hidden="true" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" aria-hidden="true" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 space-y-4">
                    {venue.schematics_url && !isEditing && (
                      <a href={venue.schematics_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded">
                        <FileImage size={14} aria-hidden="true" /> View Schematics <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    )}

                    {isEditing ? (
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-xs font-medium text-slate-500">Schematics URL</span>
                          <input type="url" value={editSchematics} onChange={(e) => setEditSchematics(e.target.value)} placeholder="https://…" className={inputCls} />
                        </label>
                        {KB_FIELDS.map((f) => (
                          <label key={f.key} className="block">
                            <span className="text-xs font-medium text-slate-500">{f.label}</span>
                            <textarea value={editKb[f.key] ?? ''} onChange={(e) => updateKbField(f.key, e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder={`${f.label} details…`} />
                          </label>
                        ))}
                        <div>
                          <span className="text-xs font-medium text-slate-500">Custom Fields</span>
                          {(editKb.custom ?? []).map((c, i) => (
                            <div key={i} className="mt-1 flex gap-2">
                              <input type="text" value={c.key} onChange={(e) => updateCustomField(i, 'key', e.target.value)} placeholder="Label" className="w-1/3 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" aria-label={`Custom field ${i + 1} label`} />
                              <input type="text" value={c.value} onChange={(e) => updateCustomField(i, 'value', e.target.value)} placeholder="Value" className="flex-1 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" aria-label={`Custom field ${i + 1} value`} />
                              <button onClick={() => removeCustomField(i)} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-slate-300 text-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" aria-label={`Remove custom field ${i + 1}`}>
                                <X size={14} aria-hidden="true" />
                              </button>
                            </div>
                          ))}
                          <button onClick={addCustomField} className="mt-2 text-xs text-amber-600 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded">
                            + Add custom field
                          </button>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => saveKb(venue.id)} disabled={saving} className="flex min-h-11 items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500">
                            {saving ? <Loader2 size={14} className="animate-spin" aria-label="Loading…" /> : <Save size={14} aria-hidden="true" />} Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {hasKb ? (
                          <dl className="space-y-2">
                            {KB_FIELDS.map((f) => kb[f.key] && (
                              <div key={f.key}>
                                <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
                                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">{kb[f.key]}</dd>
                              </div>
                            ))}
                            {(kb.custom ?? []).map((c, i) => (
                              <div key={i}>
                                <dt className="text-xs font-medium text-slate-500">{c.key}</dt>
                                <dd className="mt-0.5 text-sm text-slate-800">{c.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="text-sm text-slate-400">No knowledge base info yet.</p>
                        )}
                        <button onClick={() => startEdit(venue)} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:w-auto">
                          Edit Knowledge Base
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */
const TABS = [
  { id: 'library', label: 'Public Library' },
  { id: 'mine', label: 'My Venues' },
] as const;
type Tab = typeof TABS[number]['id'];

export default function VenuesPage() {
  const [tab, setTab] = useState<Tab>('library');

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Venues</h1>
        <p className="text-sm text-slate-500 mt-1">
          Community venue library — browse, add, and share knowledge about venues across the industry.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 ${
              tab === t.id
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'library' ? <PublicLibraryTab /> : <MyVenuesTab />}
    </div>
  );
}
