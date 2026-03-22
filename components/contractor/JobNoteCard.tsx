'use client';

import { useState } from 'react';
import { Globe, Lock, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';

interface JobNote {
  id: string;
  job_id: string;
  user_id: string;
  content: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  profiles: { display_name: string | null; username: string | null } | null;
}

interface JobNoteCardProps {
  note: JobNote;
  currentUserId: string;
  jobId: string;
  onUpdated: () => void;
}

export default function JobNoteCard({ note, currentUserId, jobId, onUpdated }: JobNoteCardProps) {
  const isOwner = note.user_id === currentUserId;
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const authorName = note.profiles?.display_name || note.profiles?.username || 'Unknown';
  const timestamp = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  async function handleSave() {
    if (!editContent.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/contractor/jobs/${jobId}/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      onUpdated();
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/contractor/jobs/${jobId}/notes/${note.id}`, {
      method: 'DELETE',
    });
    setDeleting(false);
    if (res.ok) onUpdated();
  }

  async function toggleVisibility() {
    setToggling(true);
    const res = await fetch(`/api/contractor/jobs/${jobId}/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: !note.is_public }),
    });
    setToggling(false);
    if (res.ok) onUpdated();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-slate-900 truncate">{authorName}</span>
          <span className="text-xs text-slate-400">{timestamp}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Visibility badge */}
          {isOwner ? (
            <button
              onClick={toggleVisibility}
              disabled={toggling}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition min-h-11"
              style={{
                backgroundColor: note.is_public ? 'rgb(240 253 244)' : 'rgb(248 250 252)',
                color: note.is_public ? 'rgb(22 101 52)' : 'rgb(100 116 139)',
              }}
              aria-label={toggling ? 'Updating visibility...' : note.is_public ? 'Make private' : 'Make public'}
            >
              {toggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : note.is_public ? (
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{note.is_public ? 'Public' : 'Only you'}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-2 text-xs font-medium text-green-800 min-h-11">
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Public</span>
            </span>
          )}

          {/* Edit / Delete */}
          {isOwner && !editing && (
            <>
              <button
                onClick={() => { setEditContent(note.content); setEditing(true); }}
                className="flex items-center justify-center min-h-11 min-w-11 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Edit note"
              >
                <Pencil className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center min-h-11 min-w-11 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                aria-label={deleting ? 'Deleting note...' : 'Delete note'}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <div>
          <label htmlFor={`edit-note-${note.id}`} className="sr-only">Edit note content</label>
          <textarea
            id={`edit-note-${note.id}`}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-y"
          />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={saving || !editContent.trim()}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 transition min-h-11"
              aria-label={saving ? 'Saving note...' : 'Save note'}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition min-h-11"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
      )}
    </div>
  );
}
