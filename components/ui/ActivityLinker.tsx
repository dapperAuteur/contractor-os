'use client';

// components/ui/ActivityLinker.tsx
// Reusable component for managing cross-module activity links.
// Embeddable in any module's edit/detail view.

import { useEffect, useState, useCallback } from 'react';
import { Link2, X, Plus, Search } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

// Types this app can link to. CentenarianOS types (task, recipe, workout, focus_session,
// exercise, daily_log) and travel types (trip, route, fuel_log, maintenance) were removed in
// plan 18 Phase 1; links saved earlier still list, labelled by their raw type, and can be removed.
type LinkableType = 'transaction' | 'equipment';

interface ActivityLink {
  id: string;
  linked_type: string;
  linked_id: string;
  linked_display_name: string;
  relationship: string | null;
}

interface SearchResult {
  id: string;
  display_name: string;
}

interface ActivityLinkerProps {
  /** The record this panel belongs to: 'invoice', 'transaction' or 'equipment'. */
  entityType: string;
  entityId: string;
}

const TYPE_LABELS: Record<string, string> = {
  transaction: 'Transaction',
  invoice: 'Invoice',
  equipment: 'Equipment',
};

const TYPE_COLORS: Record<string, string> = {
  transaction: 'bg-green-900/20 text-green-400 border-green-800',
  invoice: 'bg-blue-900/20 text-blue-400 border-blue-800',
  equipment: 'bg-teal-900/20 text-teal-400 border-teal-800',
};

// Linkable types (exclude the current entity type)
const LINKABLE_TYPES: LinkableType[] = ['transaction', 'equipment'];

export default function ActivityLinker({ entityType, entityId }: ActivityLinkerProps) {
  const [links, setLinks] = useState<ActivityLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<LinkableType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await offlineFetch(
        `/api/activity-links?entity_type=${entityType}&entity_id=${entityId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setLinks(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [entityType, entityId]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const handleRemove = async (linkId: string) => {
    const res = await offlineFetch('/api/activity-links', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: linkId }),
    });
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    }
  };

  const handleSearch = async () => {
    if (!addType || !searchQuery.trim()) return;
    setSearching(true);
    try {
      // Search the appropriate module's API for matching items
      let results: SearchResult[] = [];
      const q = searchQuery.trim().toLowerCase();

      switch (addType) {
        case 'transaction': {
          const res = await offlineFetch('/api/finance/transactions?limit=20');
          if (res.ok) {
            const d = await res.json();
            const txs = d.transactions || d || [];
            results = (Array.isArray(txs) ? txs : [])
              .filter((t: Record<string, string | null>) => {
                const search = `${t.vendor || ''} ${t.description || ''} ${t.transaction_date || ''}`.toLowerCase();
                return search.includes(q);
              })
              .slice(0, 10)
              .map((t: Record<string, string | number | null>) => ({
                id: String(t.id),
                display_name: `${t.vendor || 'Transaction'} $${Number(t.amount || 0).toFixed(2)} (${t.transaction_date})`,
              }));
          }
          break;
        }
        case 'equipment': {
          const res = await offlineFetch('/api/equipment');
          if (res.ok) {
            const d = await res.json();
            results = (d.equipment || [])
              .filter((e: Record<string, unknown>) => {
                const search = `${e.name || ''} ${e.brand || ''} ${e.model || ''}`.toLowerCase();
                return search.includes(q);
              })
              .slice(0, 10)
              .map((e: Record<string, unknown>) => {
                const cat = e.equipment_categories as { name: string } | null;
                return {
                  id: String(e.id),
                  display_name: cat ? `${e.name} (${cat.name})` : String(e.name),
                };
              });
          }
          break;
        }
        default:
          break;
      }

      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (targetId: string) => {
    if (!addType) return;
    const res = await offlineFetch('/api/activity-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type: entityType,
        source_id: entityId,
        target_type: addType,
        target_id: targetId,
      }),
    });
    if (res.ok) {
      // Keep panel open + type selected for batch linking
      setSearchQuery('');
      setSearchResults([]);
      loadLinks();
    }
  };

  if (loading) {
    return (
      <div className="text-xs text-slate-500 py-2">Loading links...</div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" />
          Linked Activities
        </h4>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-amber-600 hover:text-amber-400 font-medium flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Link
        </button>
      </div>

      {/* Existing links */}
      {links.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {links.map((link) => (
            <span
              key={link.id}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${TYPE_COLORS[link.linked_type] || 'bg-slate-50 text-slate-700 border-slate-200'}`}
            >
              <span className="font-medium">{TYPE_LABELS[link.linked_type] ?? link.linked_type}:</span>
              <span className="truncate max-w-48">{link.linked_display_name}</span>
              <button
                type="button"
                onClick={() => handleRemove(link.id)}
                className="ml-0.5 opacity-60 hover:opacity-100 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No linked activities yet.</p>
      )}

      {/* Add link UI */}
      {showAdd && (
        <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
          <div className="flex gap-2">
            <select
              value={addType}
              onChange={(e) => {
                setAddType(e.target.value as LinkableType);
                setSearchResults([]);
                setSearchQuery('');
              }}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs shrink-0"
            >
              <option value="">Select type...</option>
              {LINKABLE_TYPES
                .filter((t) => t !== entityType)
                .map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))
              }
            </select>
            {addType && (
              <div className="flex-1 flex gap-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                  placeholder={`Search ${TYPE_LABELS[addType] || ''}...`}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-2 py-1.5 bg-amber-600 text-white rounded-lg text-xs hover:bg-amber-500 transition disabled:opacity-50"
                >
                  <Search className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleAdd(r.id)}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-amber-500/10 rounded transition truncate"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
          {searching && <p className="text-xs text-slate-500">Searching...</p>}

          <button
            type="button"
            onClick={() => { setShowAdd(false); setAddType(''); setSearchQuery(''); setSearchResults([]); }}
            className="text-xs text-slate-500 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
