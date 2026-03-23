'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';

interface JobNoteFormProps {
  jobId: string;
  onNoteCreated: () => void;
}

export default function JobNoteForm({ jobId, onNoteCreated }: JobNoteFormProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/contractor/jobs/${jobId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setContent('');
      onNoteCreated();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4">
      <label htmlFor="new-note" className="block text-sm font-medium text-slate-700 mb-1">
        Add a note
      </label>
      <textarea
        id="new-note"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a note..."
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-y"
        aria-required="true"
      />
      <div className="flex justify-end mt-2">
        <button
          type="submit"
          disabled={saving || !content.trim()}
          aria-label={saving ? 'Saving note...' : 'Add note'}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition min-h-11"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
          {saving ? 'Saving...' : 'Add Note'}
        </button>
      </div>
    </form>
  );
}
