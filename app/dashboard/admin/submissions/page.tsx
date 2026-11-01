'use client';

// app/dashboard/admin/submissions/page.tsx
// Admin curation queue — review new user-submitted equipment.
// Promote items to the shared equipment catalog, or dismiss.
// Exercise submissions are CentenarianOS's and are no longer shown here (plan 18 Phase 1).

import { useEffect, useState, useCallback } from 'react';
import {
  Inbox, CheckCheck, Trash2, Loader2, Package,
  ArrowUpRight, Check,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Notification {
  id: string;
  type: 'new_equipment';
  user_email: string | null;
  entity_name: string;
  entity_id: string;
  entity_meta: {
    category?: string | null;
    brand?: string | null;
    model?: string | null;
    condition?: string | null;
  };
  is_read: boolean;
  promoted: boolean;
  created_at: string;
}

export default function AdminSubmissionsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<Record<string, boolean>>({});
  const [dismissing, setDismissing] = useState<Record<string, boolean>>({});
  const [promoted, setPromoted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const res = await offlineFetch('/api/admin/notifications?type=new_equipment');
    if (res.ok) {
      const d = await res.json();
      setNotifications(d.notifications || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    await offlineFetch('/api/admin/notifications?type=new_equipment', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handlePromote = async (n: Notification) => {
    setPromoting((prev) => ({ ...prev, [n.id]: true }));
    try {
      const body = { equipment_id: n.entity_id, notification_id: n.id };

      const res = await offlineFetch('/api/admin/equipment/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setPromoted((prev) => new Set(prev).add(n.id));
      }
    } finally {
      setPromoting((prev) => { const next = { ...prev }; delete next[n.id]; return next; });
    }
  };

  const handleDismiss = async (id: string) => {
    setDismissing((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await offlineFetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDismissed((prev) => new Set(prev).add(id));
      }
    } finally {
      setDismissing((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }
  };

  const visible = notifications.filter((n) => {
    if (dismissed.has(n.id)) return false;
    return n.type === 'new_equipment';
  });

  const unread = notifications.filter((n) => n.type === 'new_equipment' && !n.is_read && !n.promoted).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Inbox className="w-7 h-7 text-amber-600 shrink-0" />
            Equipment Submissions
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {unread > 0
              ? `${unread} unread submission${unread !== 1 ? 's' : ''} — review and promote to the equipment catalog.`
              : 'All caught up. Equipment added by users appears here for review.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllRead}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </button>
        </div>
      </header>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No submissions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((n) => {
            const isPromoted = promoted.has(n.id) || n.promoted;
            const isDismissed = dismissed.has(n.id);
            if (isDismissed) return null;

            return (
              <div
                key={n.id}
                className={`bg-white border rounded-xl p-4 transition ${
                  n.is_read || isPromoted
                    ? 'border-slate-200 opacity-75'
                    : 'border-indigo-200 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="p-2 rounded-lg shrink-0 bg-indigo-50">
                    <Package className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-900 text-sm">{n.entity_name}</span>
                      {!n.is_read && !isPromoted && (
                        <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 shrink-0" title="Unread" />
                      )}
                      {isPromoted && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                          Promoted
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      Added by <span className="text-slate-700">{n.user_email || 'unknown'}</span>
                      {' · '}
                      {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {n.entity_meta.category && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {n.entity_meta.category}
                        </span>
                      )}
                      {n.entity_meta.brand && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {n.entity_meta.brand}
                          {n.entity_meta.model ? ` ${n.entity_meta.model}` : ''}
                        </span>
                      )}
                      {n.entity_meta.condition && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                          {n.entity_meta.condition}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {!isPromoted && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <button
                          onClick={() => handlePromote(n)}
                          disabled={!!promoting[n.id]}
                          className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {promoting[n.id]
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Promoting...</>
                            : <><ArrowUpRight className="w-3 h-3" /> Add to Equipment Catalog</>
                          }
                        </button>

                        <button
                          onClick={() => handleDismiss(n.id)}
                          disabled={!!dismissing[n.id]}
                          className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs hover:bg-slate-50 flex items-center gap-1.5"
                        >
                          {dismissing[n.id]
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />
                          }
                          Dismiss
                        </button>
                      </div>
                    )}

                    {isPromoted && (
                      <div className="flex items-center gap-1.5 text-xs text-green-700">
                        <Check className="w-3.5 h-3.5" />
                        Added to Equipment Catalog
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
