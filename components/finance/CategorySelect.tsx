'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

export interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  monthly_budget: number | null;
}

interface CategorySelectProps<T extends { id: string; name: string }> {
  value: string;
  onChange: (categoryId: string) => void;
  categories: T[];
  onCategoryCreated: (cat: BudgetCategory) => void;
  label?: string;
  className?: string;
}

export default function CategorySelect<T extends { id: string; name: string }>({
  value,
  onChange,
  categories,
  onCategoryCreated,
  label = 'Category',
  className = '',
}: CategorySelectProps<T>) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await offlineFetch('/api/finance/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (res.ok) {
        const { category } = await res.json();
        onCategoryCreated(category);
        onChange(category.id);
        setShowForm(false);
        setName('');
        setColor('#6366f1');
      }
    } finally {
      setSaving(false);
    }
  }

  const selectId = `catsel-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={className}>
      <label htmlFor={selectId} className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
        >
          <option value="">None</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowForm((p) => !p)}
          className="shrink-0 p-2 rounded-lg border text-slate-500 hover:bg-slate-50 transition"
          aria-label={showForm ? 'Close new category form' : 'Add new category'}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="mt-2 p-3 border rounded-lg bg-slate-50 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              aria-required="true"
              aria-label="New category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
              placeholder="Category name"
              autoFocus
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 border rounded-lg cursor-pointer shrink-0"
              aria-label="Category color"
            />
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="shrink-0 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50 transition"
            >
              {saving ? '...' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
