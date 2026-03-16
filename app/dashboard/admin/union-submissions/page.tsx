'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, CheckCircle, XCircle, FileText, ExternalLink, AlertTriangle, RotateCcw, Globe, Lock,
} from 'lucide-react';

interface Submission {
  id: string;
  file_url: string;
  file_name: string;
  union_local: string | null;
  doc_type: string;
  description: string | null;
  coverage_dates: string | null;
  status: string;
  admin_notes: string | null;
  document_id: string | null;
  created_at: string;
  submitter: { email: string; username: string };
}

interface UnionDoc {
  id: string;
  name: string;
  union_local: string | null;
  doc_type: string;
  is_shared: boolean;
  status: string;
  error_msg: string | null;
  page_count: number | null;
  updated_at: string;
  created_at: string;
  user_id: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  contract: 'Contract',
  bylaws: 'Bylaws',
  rate_sheet: 'Rate Sheet',
  rules: 'Work Rules',
  other: 'Other',
};

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  pending: { color: 'text-yellow-400 bg-yellow-500/20', label: 'Pending' },
  processing: { color: 'text-blue-400 bg-blue-500/20', label: 'Processing' },
  approved: { color: 'text-cyan-400 bg-cyan-500/20', label: 'Approved' },
  rejected: { color: 'text-red-400 bg-red-500/20', label: 'Rejected' },
  live: { color: 'text-green-400 bg-green-500/20', label: 'Live' },
};

function daysAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function AdminUnionSubmissionsPage() {
  const [adminTab, setAdminTab] = useState<'submissions' | 'documents'>('submissions');

  // Submissions state
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>('all');

  // Documents state
  const [stuckDocs, setStuckDocs] = useState<UnionDoc[]>([]);
  const [stuckLoading, setStuckLoading] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const loadSubs = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/union-submissions')
      .then((r) => r.json())
      .then((d) => setSubs(d.submissions ?? []))
      .finally(() => setLoading(false));
  }, []);

  const loadStuckDocs = useCallback(() => {
    setStuckLoading(true);
    fetch('/api/admin/union-documents?status=processing')
      .then((r) => r.json())
      .then((d) => setStuckDocs(d.documents ?? []))
      .finally(() => setStuckLoading(false));
  }, []);

  useEffect(() => { loadSubs(); }, [loadSubs]);
  useEffect(() => { if (adminTab === 'documents') loadStuckDocs(); }, [adminTab, loadStuckDocs]);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setProcessingId(id);
    const res = await fetch(`/api/admin/union-submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, admin_notes: notes[id] || undefined }),
    });
    setProcessingId(null);
    if (res.ok) loadSubs();
  }

  async function resetDoc(id: string) {
    setResettingId(id);
    const res = await fetch(`/api/admin/union-documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'error',
        error_msg: 'Processing timed out. Please re-upload the document.',
      }),
    });
    setResettingId(null);
    if (res.ok) loadStuckDocs();
  }

  const filtered = filter === 'all' ? subs : subs.filter((s) => s.status === filter);
  const pendingCount = subs.filter((s) => s.status === 'pending').length;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-900">
          Union Documents
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-sm font-medium text-yellow-400">
              {pendingCount} pending
            </span>
          )}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200" role="tablist" aria-label="Admin views">
        <button
          role="tab"
          aria-selected={adminTab === 'submissions'}
          onClick={() => setAdminTab('submissions')}
          className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 ${
            adminTab === 'submissions'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Submissions ({subs.length})
        </button>
        <button
          role="tab"
          aria-selected={adminTab === 'documents'}
          onClick={() => setAdminTab('documents')}
          className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 ${
            adminTab === 'documents'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Stuck Documents
          {stuckDocs.length > 0 && (
            <span className="ml-1.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
              {stuckDocs.length}
            </span>
          )}
        </button>
      </div>

      {/* Submissions tab */}
      {adminTab === 'submissions' && (
        <>
          <div className="flex justify-end">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
              aria-label="Filter by status"
            >
              <option value="all">All ({subs.length})</option>
              <option value="pending">Pending ({subs.filter((s) => s.status === 'pending').length})</option>
              <option value="live">Live ({subs.filter((s) => s.status === 'live').length})</option>
              <option value="rejected">Rejected ({subs.filter((s) => s.status === 'rejected').length})</option>
              <option value="processing">Processing ({subs.filter((s) => s.status === 'processing').length})</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-slate-400" size={28} aria-label="Loading submissions" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
              {filter === 'all' ? 'No submissions yet.' : `No ${filter} submissions.`}
            </div>
          ) : (
            <div className="space-y-3" role="list" aria-label="Union document submissions">
              {filtered.map((sub) => {
                const st = STATUS_STYLES[sub.status] ?? STATUS_STYLES.pending;
                const isPending = sub.status === 'pending';
                const isProcessing = processingId === sub.id;

                return (
                  <article key={sub.id} role="listitem" className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText size={14} className="text-amber-400 shrink-0" aria-hidden="true" />
                          <span className="font-medium text-slate-900 text-sm">{sub.file_name}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            {DOC_TYPE_LABELS[sub.doc_type] ?? sub.doc_type}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                            {st.label}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                          <span>by <strong className="text-slate-700">{sub.submitter.username}</strong></span>
                          {sub.submitter.email && <span>({sub.submitter.email})</span>}
                          {sub.union_local && <span>· {sub.union_local}</span>}
                          {sub.coverage_dates && <span>· {sub.coverage_dates}</span>}
                          <span>· {new Date(sub.created_at).toLocaleDateString()}</span>
                        </div>
                        {sub.description && (
                          <p className="mt-1 text-xs text-slate-500">{sub.description}</p>
                        )}
                        {sub.admin_notes && (
                          <p className="mt-1 text-xs text-slate-400 italic">
                            <AlertTriangle size={10} className="inline mr-1" aria-hidden="true" />
                            {sub.admin_notes}
                          </p>
                        )}
                      </div>
                      <a
                        href={sub.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-11 min-w-11 flex items-center justify-center rounded text-slate-400 hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        aria-label={`Download ${sub.file_name}`}
                      >
                        <ExternalLink size={16} aria-hidden="true" />
                      </a>
                    </div>

                    {isPending && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end border-t border-slate-200 pt-3">
                        <label className="flex-1 block">
                          <span className="text-xs font-medium text-slate-400">Admin Notes (optional)</span>
                          <input
                            type="text"
                            value={notes[sub.id] || ''}
                            onChange={(e) => setNotes({ ...notes, [sub.id]: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                            placeholder="Reason or feedback..."
                            aria-label="Admin notes for this submission"
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(sub.id, 'approve')}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-11"
                            aria-label={`Approve ${sub.file_name}`}
                          >
                            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} aria-hidden="true" />}
                            Approve & Process
                          </button>
                          <button
                            onClick={() => handleAction(sub.id, 'reject')}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-11"
                            aria-label={`Reject ${sub.file_name}`}
                          >
                            <XCircle size={14} aria-hidden="true" />
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {sub.status === 'live' && sub.document_id && (
                      <p className="text-xs text-green-400 border-t border-slate-200 pt-2">
                        <CheckCircle size={12} className="inline mr-1" aria-hidden="true" />
                        Live in community RAG
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Stuck Documents tab */}
      {adminTab === 'documents' && (
        <>
          <p className="text-sm text-slate-500">
            Documents stuck in <strong>processing</strong> status — likely caused by a timed-out request.
            Resetting to <strong>error</strong> lets the user see the failure and re-upload the file.
          </p>

          {stuckLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-slate-400" size={28} aria-label="Loading documents" />
            </div>
          ) : stuckDocs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
              No documents stuck in processing.
            </div>
          ) : (
            <div className="space-y-2" role="list" aria-label="Stuck documents">
              {stuckDocs.map((doc) => {
                const isResetting = resettingId === doc.id;
                return (
                  <article key={doc.id} role="listitem" className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText size={14} className="text-amber-400 shrink-0" aria-hidden="true" />
                          <span className="font-medium text-slate-900 text-sm">{doc.name}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                          </span>
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                            processing
                          </span>
                          {doc.is_shared ? (
                            <span className="flex items-center gap-0.5 text-xs text-green-600">
                              <Globe size={10} aria-hidden="true" /> Shared
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-xs text-slate-400">
                              <Lock size={10} aria-hidden="true" /> Private
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                          {doc.union_local && <span>{doc.union_local}</span>}
                          <span>· stuck {daysAgo(doc.updated_at)}</span>
                          <span>· uploaded {new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => resetDoc(doc.id)}
                        disabled={isResetting}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-11"
                        aria-label={`Reset ${doc.name} to error`}
                      >
                        {isResetting
                          ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                          : <RotateCcw size={14} aria-hidden="true" />}
                        Reset to Error
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
