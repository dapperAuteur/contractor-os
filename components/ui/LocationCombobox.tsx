'use client';

// components/ui/LocationCombobox.tsx
// Combobox for selecting or creating a venue/location on the job form.
// Sources from the user's saved contact_locations (private).
// Inline "Add new venue" creates a location under the "My Venues" system contact.

import { useEffect, useId, useRef, useState, useCallback } from 'react';
import { Plus, X, ChevronDown, Loader2, MapPin } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface SavedLocation {
  id: string;
  label: string;
  address: string | null;
  contact_name: string;
}

interface LocationComboboxProps {
  value: string;
  locationId: string | null;
  onChange: (label: string, id: string | null) => void;
  placeholder?: string;
}

const INPUT_CLS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';

export default function LocationCombobox({
  value,
  locationId,
  onChange,
  placeholder = 'Search or add venue…',
}: LocationComboboxProps) {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    offlineFetch('/api/contractor/locations')
      .then((r) => r.json())
      .then((d) => setLocations(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setShowAdd(false); setFilter('');
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const filtered = filter
    ? locations.filter(
        (l) =>
          l.label.toLowerCase().includes(filter.toLowerCase()) ||
          (l.address ?? '').toLowerCase().includes(filter.toLowerCase()),
      )
    : locations;

  function openDropdown() {
    setFilter(value || '');
    setOpen(true);
    setShowAdd(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function select(loc: SavedLocation) {
    onChange(loc.label, loc.id);
    setOpen(false); setFilter('');
  }

  function clear() {
    onChange('', null);
    setOpen(false);
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setShowAdd(false); setFilter(''); }
  }, []);

  async function handleAdd() {
    if (!addLabel.trim()) return;
    setSaving(true);
    setAddError('');
    try {
      const res = await offlineFetch('/api/contractor/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: addLabel.trim(), address: addAddress.trim() || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
      const newLoc: SavedLocation = await res.json();
      setLocations((prev) => [newLoc, ...prev.filter((l) => l.id !== newLoc.id)]);
      onChange(newLoc.label, newLoc.id);
      setOpen(false); setShowAdd(false);
      setAddLabel(''); setAddAddress('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        className="flex items-center w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm cursor-pointer focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/30"
        onClick={openDropdown}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
      >
        <MapPin size={14} className="text-slate-400 shrink-0 mr-2" aria-hidden="true" />
        <span className={`flex-1 truncate ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="ml-1 text-slate-400 hover:text-slate-600"
            aria-label="Clear venue"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
        {!value && <ChevronDown size={14} className="text-slate-400 shrink-0" aria-hidden="true" />}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Filter */}
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search venues…"
              className="w-full text-sm px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400"
              aria-label="Filter venues"
            />
          </div>

          {/* List */}
          <ul id={listboxId} role="listbox" className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && !showAdd && (
              <li className="px-3 py-2 text-sm text-slate-400 text-center">
                {filter ? `No matches for "${filter}"` : 'No saved venues yet'}
              </li>
            )}
            {filtered.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l.id === locationId}
                  onClick={() => select(l)}
                  className={`w-full text-left flex flex-col px-3 py-2 text-sm hover:bg-amber-50 transition ${l.id === locationId ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-800'}`}
                >
                  <span className="truncate font-medium">{l.label}</span>
                  {l.address && (
                    <span className="text-xs text-slate-400 truncate mt-0.5">{l.address}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Add new */}
          {!showAdd ? (
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={() => { setShowAdd(true); setAddLabel(filter); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition font-medium"
              >
                <Plus size={14} aria-hidden="true" /> Add new venue
              </button>
            </div>
          ) : (
            <div className="border-t border-slate-100 p-3 space-y-2 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New venue</p>
              <input
                autoFocus
                type="text"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Venue name *"
                className={INPUT_CLS}
                aria-label="New venue name"
              />
              <input
                type="text"
                value={addAddress}
                onChange={(e) => setAddAddress(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Address"
                className={INPUT_CLS}
                aria-label="New venue address"
              />
              {addError && <p className="text-xs text-red-600" role="alert">{addError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddLabel(''); setAddAddress(''); }}
                  className="flex-1 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving || !addLabel.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
