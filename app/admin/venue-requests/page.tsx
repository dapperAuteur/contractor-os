'use client';

// app/admin/venue-requests/page.tsx
// Admin review queue for pending venue change requests.

import { useEffect, useState, useCallback } from 'react';
import { MapPin, Edit2, Trash2, ChevronDown, ChevronUp, Check, X, Loader2, Clock } from 'lucide-react';

interface VenueRequest {
  id: string;
  venue_id: string;
  user_id: string;
  request_type: 'edit' | 'delete';
  proposed_changes: Record<string, unknown> | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  venue: { name: string; city: string | null; state: string | null; venue_type: string | null } | null;
  requester: { username: string | null; display_name: string | null } | null;
}

const KB_LABELS: Record<string, string> = {
  parking: 'Parking',
  load_in: 'Load-In',
  wifi: 'WiFi',
  power: 'Power',
  catering: 'Catering',
  security: 'Security',
};

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

function ProposedChangesDiff({ current, proposed }: {
  current: Record<string, unknown> | null;
  proposed: Record<string, unknown> | null;
}) {
  if (!proposed) return <p className="text-slate-500 text-sm italic">No changes provided.</p>;
  const keys = Object.keys(proposed);
  if (keys.length === 0) return <p className="text-slate-500 text-sm italic">No changes specified.</p>;

  return (
    <div className="space-y-2">
      {keys.map((key) => {
        const label = key === 'knowledge_base' ? 'Knowledge Base' : (KB_LABELS[key] ?? key.replace(/_/g, ' '));
        const newVal = proposed[key];
        const oldVal = current?.[key];
        const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
        return (
          <div key={key} className={`rounded-lg px-3 py-2 text-xs ${changed ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
            <p className="font-semibold text-slate-700 capitalize mb-1">{label}</p>
            {changed ? (
              <div className="space-y-0.5">
                <p className="text-red-600 line-through">{formatValue(oldVal)}</p>
                <p className="text-green-600">{formatValue(newVal)}</p>
              </div>
            ) : (
              <p className="text-slate-400">Unchanged — {formatValue(newVal)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminVenueRequestsPage() {
  const [items, setItems] = useState<VenueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/venue-requests?status=${filter}`)
      .then((r) => r.json())
      .then((d) => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActing(id);
    setActionError((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch(`/api/admin/venue-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_note: noteText[id] ?? '' }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed');
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setExpanded(null);
    } catch (e) {
      setActionError((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : 'Action failed' }));
    } finally {
      setActing(null);
    }
  }

  const counts = {
    pending: items.filter((i) => i.status === 'pending').length,
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Venue Change Requests</h1>
      <p className="text-slate-500 text-sm mb-6">
        Review edit and deletion requests submitted by users for public venue listings.
      </p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setFilter(s); setExpanded(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              filter === s
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            {s}
            {s === 'pending' && counts.pending > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {counts.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No {filter} requests.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isOpen = expanded === item.id;
            const isEdit = item.request_type === 'edit';
            return (
              <div key={item.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Row header */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-100/60 transition text-left"
                >
                  {/* Request type badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                    isEdit
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {isEdit ? <Edit2 className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                    {isEdit ? 'Edit' : 'Delete'}
                  </span>

                  {/* Venue info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <p className="text-slate-800 text-sm font-medium truncate">
                        {item.venue?.name ?? 'Unknown Venue'}
                      </p>
                      {item.venue?.city && (
                        <span className="text-slate-400 text-xs shrink-0">
                          · {item.venue.city}{item.venue.state ? `, ${item.venue.state}` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">
                      by {item.requester?.display_name ?? item.requester?.username ?? 'Unknown user'}
                      {item.reason && ` · "${item.reason}"`}
                    </p>
                  </div>

                  <span className="text-slate-400 text-xs whitespace-nowrap shrink-0">
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>

                  {item.status !== 'pending' && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      item.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {item.status}
                    </span>
                  )}

                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-200 px-5 py-5 space-y-5">
                    {/* Request details */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">
                        {isEdit ? 'Proposed Changes' : 'Deletion Request'}
                      </p>
                      {isEdit ? (
                        <ProposedChangesDiff
                          current={null}
                          proposed={item.proposed_changes}
                        />
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                          <p className="text-red-700 text-sm font-medium">
                            User is requesting this venue be removed from the public library.
                          </p>
                          {item.reason && (
                            <p className="text-red-600 text-xs mt-1">Reason: {item.reason}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {item.admin_note && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Admin Note</p>
                        <p className="text-slate-700 text-sm bg-slate-100 rounded-lg px-3 py-2">{item.admin_note}</p>
                      </div>
                    )}

                    {/* Approve / Reject (pending only) */}
                    {item.status === 'pending' && (
                      <div className="pt-2 border-t border-slate-200 space-y-3">
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Admin Note (optional)</p>
                        <textarea
                          value={noteText[item.id] ?? ''}
                          onChange={(e) => setNoteText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          rows={2}
                          placeholder="Leave a note for internal records or to communicate reason to requester…"
                          aria-label="Admin note"
                          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 resize-none"
                        />

                        {actionError[item.id] && (
                          <p className="text-red-400 text-xs" role="alert">{actionError[item.id]}</p>
                        )}

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => handleAction(item.id, 'approve')}
                            disabled={acting === item.id}
                            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 min-h-11"
                          >
                            {acting === item.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Check className="w-4 h-4" />}
                            {isEdit ? 'Approve Changes' : 'Approve Deletion'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(item.id, 'reject')}
                            disabled={acting === item.id}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 text-red-600 hover:text-red-700 border border-slate-200 hover:border-red-200 rounded-lg text-sm font-semibold transition disabled:opacity-50 min-h-11"
                          >
                            {acting === item.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <X className="w-4 h-4" />}
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
