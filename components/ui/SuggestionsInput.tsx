'use client';

// components/ui/SuggestionsInput.tsx
// Text input with a history-based suggestions dropdown.
// Used for union_local and department on the job form.
// User can type freely OR pick from past values — not forced to select.

import { useEffect, useRef, useState } from 'react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface SuggestionsInputProps {
  value: string;
  onChange: (value: string) => void;
  field: 'union_local' | 'department';
  placeholder?: string;
  className?: string;
}

export default function SuggestionsInput({
  value,
  onChange,
  field,
  placeholder,
  className,
}: SuggestionsInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    offlineFetch(`/api/contractor/suggestions?field=${field}`)
      .then((r) => r.json())
      .then((d) => setSuggestions(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [field]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
    : suggestions;

  const showDropdown = open && filtered.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        placeholder={placeholder}
        className={
          className ??
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30'
        }
        autoComplete="off"
      />
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto py-1"
        >
          {filtered.map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                aria-selected={s === value}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep input focused
                  onChange(s);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-amber-50 transition"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
