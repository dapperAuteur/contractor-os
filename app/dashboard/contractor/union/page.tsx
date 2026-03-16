'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Loader2, Upload, FileText, Trash2, Globe, Lock, AlertTriangle, CheckCircle, Clock, X, Send,
  Pencil, RefreshCw, Save,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Submission {
  id: string;
  file_name: string;
  file_url: string;
  union_local: string | null;
  doc_type: string;
  description: string | null;
  coverage_dates: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  replaces_document_id: string | null;
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
  created_at: string;
  author?: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  contract: 'Contract',
  bylaws: 'Bylaws',
  rate_sheet: 'Rate Sheet',
  rules: 'Work Rules',
  other: 'Other',
};

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle; color: string }> = {
  ready: { icon: CheckCircle, color: 'text-green-600' },
  processing: { icon: Clock, color: 'text-yellow-600' },
  pending: { icon: Clock, color: 'text-slate-500' },
  error: { icon: AlertTriangle, color: 'text-red-500' },
};

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';
const labelClass = 'block text-xs font-medium text-slate-500 mb-1';

export default function UnionDocumentsPage() {
  const [docs, setDocs] = useState<UnionDoc[]>([]);
  const [shared, setShared] = useState<UnionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tab, setTab] = useState<'mine' | 'shared' | 'submissions'>('mine');
  const fileRef = useRef<HTMLInputElement>(null);
  const submitFileRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', union_local: '', doc_type: 'contract', is_shared: false });
  const [saving, setSaving] = useState(false);

  // Replace state
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [replaceError, setReplaceError] = useState('');
  const replaceFileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    union_local: '',
    doc_type: 'contract',
    is_shared: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [submitForm, setSubmitForm] = useState({
    union_local: '',
    doc_type: 'contract',
    description: '',
    coverage_dates: '',
  });
  const [submitFile, setSubmitFile] = useState<File | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      offlineFetch('/api/contractor/union/documents').then((r) => r.json()),
      offlineFetch('/api/contractor/union/submissions').then((r) => r.json()),
    ])
      .then(([docData, subData]) => {
        setDocs(docData.documents ?? []);
        setShared(docData.shared ?? []);
        setSubmissions(subData.submissions ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function uploadDoc() {
    if (!selectedFile || !form.name.trim()) return;
    setUploading(true);
    setUploadError('');

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('name', form.name.trim());
    fd.append('doc_type', form.doc_type);
    fd.append('is_shared', String(form.is_shared));
    if (form.union_local.trim()) fd.append('union_local', form.union_local.trim());

    const res = await offlineFetch('/api/contractor/union/documents', { method: 'POST', body: fd });
    setUploading(false);

    if (res.ok) {
      setShowUpload(false);
      setForm({ name: '', union_local: '', doc_type: 'contract', is_shared: false });
      setSelectedFile(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setUploadError(data.error ?? 'Upload failed. Please try again.');
    }
  }

  async function deleteDoc(id: string) {
    setDeletingId(id);
    await offlineFetch(`/api/contractor/union/documents/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    load();
  }

  function startEdit(doc: UnionDoc) {
    setEditingId(doc.id);
    setEditForm({ name: doc.name, union_local: doc.union_local ?? '', doc_type: doc.doc_type, is_shared: doc.is_shared });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const res = await offlineFetch(`/api/contractor/union/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name.trim(),
        union_local: editForm.union_local.trim() || null,
        doc_type: editForm.doc_type,
        is_shared: editForm.is_shared,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setDocs((prev) => prev.map((d) => d.id === id ? { ...d, ...updated } : d));
      setEditingId(null);
    }
  }

  async function submitReplacement() {
    if (!replaceFile || !replacingId) return;
    setReplacing(true);
    setReplaceError('');

    const fd = new FormData();
    fd.append('file', replaceFile);

    const res = await offlineFetch(`/api/contractor/union/documents/${replacingId}/replace`, { method: 'POST', body: fd });
    setReplacing(false);

    if (res.ok) {
      setReplacingId(null);
      setReplaceFile(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setReplaceError(data.error ?? 'Replacement failed. Please try again.');
    }
  }

  async function submitToCommunity() {
    if (!submitFile) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append('file', submitFile);
    fd.append('doc_type', submitForm.doc_type);
    if (submitForm.union_local.trim()) fd.append('union_local', submitForm.union_local.trim());
    if (submitForm.description.trim()) fd.append('description', submitForm.description.trim());
    if (submitForm.coverage_dates.trim()) fd.append('coverage_dates', submitForm.coverage_dates.trim());

    const res = await offlineFetch('/api/contractor/union/submissions', { method: 'POST', body: fd });
    setSubmitting(false);
    if (res.ok) {
      setShowSubmit(false);
      setSubmitForm({ union_local: '', doc_type: 'contract', description: '', coverage_dates: '' });
      setSubmitFile(null);
      setTab('submissions');
      load();
    }
  }

  // Check if there's a pending replacement submission for a doc
  const pendingReplacementFor = (docId: string) =>
    submissions.some((s) => s.replaces_document_id === docId && s.status === 'pending');

  const list = tab === 'mine' ? docs : tab === 'shared' ? shared : [];

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      {/* Disclaimer banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2" role="alert">
        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-amber-700">
          AI-generated summaries are for reference only. They are not legal advice.
          Always consult your union representative or the official contract document for authoritative answers.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-900">Union Documents</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSubmit(true)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-600 px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white min-h-11"
            aria-label="Submit document to community for review"
          >
            <Send size={14} aria-hidden="true" /> Submit to Community
          </button>
          <button
            onClick={() => { setShowUpload(true); setUploadError(''); }}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white min-h-11"
          >
            <Upload size={14} aria-hidden="true" /> Upload
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200" role="tablist" aria-label="Document views">
        {[
          { id: 'mine' as const, label: 'My Documents' },
          { id: 'shared' as const, label: `Community (${shared.length})` },
          { id: 'submissions' as const, label: `My Submissions (${submissions.length})` },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 ${
              tab === t.id
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Upload Document</h2>
            <button
              onClick={() => { setShowUpload(false); setUploadError(''); setSelectedFile(null); }}
              className="min-h-11 min-w-11 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Close upload form"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {uploadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {uploadError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Document Name *</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="IATSE Local 317 Contract 2025-2028"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Union Local</span>
              <input
                type="text"
                value={form.union_local}
                onChange={(e) => setForm({ ...form, union_local: e.target.value })}
                className={inputClass}
                placeholder="IATSE 317"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Document Type *</span>
              <select
                value={form.doc_type}
                onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
                className={inputClass}
              >
                {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <div>
              <span className={labelClass}>File (PDF, TXT, MD) *</span>
              <div className="mt-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:text-slate-700 hover:file:bg-slate-200 focus:outline-none"
                  aria-label="Select file to upload"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_shared}
              onChange={(e) => setForm({ ...form, is_shared: e.target.checked })}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 focus:ring-offset-white"
            />
            Share with community (others in same union can search this document)
          </label>

          <div className="flex gap-2 pt-1">
            <button
              onClick={uploadDoc}
              disabled={uploading || !form.name.trim() || !selectedFile}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white min-h-11"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
              {uploading ? 'Processing...' : 'Upload & Process'}
            </button>
            <button
              onClick={() => { setShowUpload(false); setSelectedFile(null); setUploadError(''); }}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-11"
            >
              Cancel
            </button>
          </div>

          {uploading && (
            <p className="text-xs text-slate-400">
              Extracting text, chunking, and generating embeddings. This may take a moment for large documents.
            </p>
          )}
        </div>
      )}

      {/* Submit to Community form */}
      {showSubmit && (
        <div className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Submit to Community</h2>
            <button
              onClick={() => setShowSubmit(false)}
              className="min-h-11 min-w-11 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Close submit form"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Submit a union document for admin review. Once approved, it will be processed and available in the community RAG for all users to search.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Union Local</span>
              <input
                type="text"
                value={submitForm.union_local}
                onChange={(e) => setSubmitForm({ ...submitForm, union_local: e.target.value })}
                className={inputClass}
                placeholder="IATSE 317"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Document Type *</span>
              <select
                value={submitForm.doc_type}
                onChange={(e) => setSubmitForm({ ...submitForm, doc_type: e.target.value })}
                className={inputClass}
              >
                {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Coverage Dates</span>
              <input
                type="text"
                value={submitForm.coverage_dates}
                onChange={(e) => setSubmitForm({ ...submitForm, coverage_dates: e.target.value })}
                className={inputClass}
                placeholder="2025-2028"
              />
            </label>
            <div>
              <span className={labelClass}>File (PDF, TXT, MD) *</span>
              <div className="mt-1">
                <input
                  ref={submitFileRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => setSubmitFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:text-slate-700 hover:file:bg-slate-200 focus:outline-none"
                  aria-label="Select file to submit"
                />
              </div>
            </div>
          </div>

          <label className="block">
            <span className={labelClass}>Description</span>
            <textarea
              value={submitForm.description}
              onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
              rows={2}
              className={inputClass + ' resize-none'}
              placeholder="Explain what this document covers and how it should be used..."
            />
          </label>

          <div className="flex gap-2 pt-1">
            <button
              onClick={submitToCommunity}
              disabled={submitting || !submitFile}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white min-h-11"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
            <button
              onClick={() => { setShowSubmit(false); setSubmitFile(null); }}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-11"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-slate-400" size={24} aria-label="Loading..." />
        </div>
      ) : tab === 'submissions' ? (
        /* Submissions list */
        submissions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            No submissions yet. Submit a document for community review.
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="My submissions">
            {submissions.map((sub) => {
              const statusColors: Record<string, string> = {
                pending: 'text-yellow-700 bg-yellow-100',
                processing: 'text-blue-700 bg-blue-100',
                approved: 'text-teal-700 bg-teal-100',
                rejected: 'text-red-700 bg-red-100',
                live: 'text-green-700 bg-green-100',
              };
              const sc = statusColors[sub.status] ?? statusColors.pending;
              return (
                <article key={sub.id} role="listitem" className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Send size={14} className="text-amber-600 shrink-0" aria-hidden="true" />
                        <span className="font-medium text-slate-900 text-sm">{sub.file_name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          {DOC_TYPE_LABELS[sub.doc_type] ?? sub.doc_type}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sc}`}>
                          {sub.status}
                        </span>
                        {sub.replaces_document_id && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            replacement
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                        {sub.union_local && <span>{sub.union_local}</span>}
                        {sub.coverage_dates && <span>· {sub.coverage_dates}</span>}
                        <span>· {new Date(sub.created_at).toLocaleDateString()}</span>
                      </div>
                      {sub.description && (
                        <p className="mt-1 text-xs text-slate-500">{sub.description}</p>
                      )}
                      {sub.admin_notes && (
                        <p className="mt-1 text-xs text-slate-400 italic">Admin: {sub.admin_notes}</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
          {tab === 'mine'
            ? 'No documents yet. Upload a union contract, bylaws, or rate sheet to get started.'
            : 'No shared documents from the community yet.'}
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label={tab === 'mine' ? 'My documents' : 'Shared documents'}>
          {list.map((doc) => {
            const statusInfo = STATUS_STYLES[doc.status] ?? STATUS_STYLES.pending;
            const StatusIcon = statusInfo.icon;
            const isEditing = editingId === doc.id;
            const isReplacing = replacingId === doc.id;
            const hasPendingReplacement = tab === 'mine' && pendingReplacementFor(doc.id);

            return (
              <article
                key={doc.id}
                role="listitem"
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText size={14} className="text-amber-600 shrink-0" aria-hidden="true" />
                      <span className="font-medium text-slate-900 text-sm">{doc.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                      </span>
                      <span className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                        <StatusIcon size={12} aria-hidden="true" />
                        {doc.status}
                      </span>
                      {hasPendingReplacement && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          replacement pending review
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                      {doc.union_local && <span>{doc.union_local}</span>}
                      {doc.page_count != null && <span>· {doc.page_count} chunks</span>}
                      <span>· {new Date(doc.created_at).toLocaleDateString()}</span>
                      {doc.is_shared ? (
                        <span className="flex items-center gap-0.5 text-green-600">
                          <Globe size={10} aria-hidden="true" /> Shared
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-slate-400">
                          <Lock size={10} aria-hidden="true" /> Private
                        </span>
                      )}
                      {doc.author && <span>· by {doc.author}</span>}
                    </div>
                    {doc.error_msg && (
                      <p className="mt-1 text-xs text-red-500">{doc.error_msg}</p>
                    )}
                    {doc.status === 'processing' && !doc.error_msg && (
                      <p className="mt-1 text-xs text-slate-400">
                        Taking longer than expected? Use <strong>Retry</strong> to re-upload the file.
                      </p>
                    )}
                  </div>

                  {tab === 'mine' && !isEditing && !isReplacing && (
                    <div className="flex items-center gap-1 shrink-0">
                      {(doc.status === 'error' || doc.status === 'processing') && (
                        <button
                          onClick={() => { setReplacingId(doc.id); setReplaceError(''); setReplaceFile(null); setEditingId(null); }}
                          className="flex items-center gap-1 min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          aria-label={`Retry processing ${doc.name}`}
                        >
                          <RefreshCw size={12} aria-hidden="true" />
                          Retry
                        </button>
                      )}
                      <button
                        onClick={() => { startEdit(doc); setReplacingId(null); }}
                        className="min-h-11 min-w-11 flex items-center justify-center rounded text-slate-400 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        aria-label={`Edit ${doc.name}`}
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                      {doc.status === 'ready' && (
                        <button
                          onClick={() => { setReplacingId(doc.id); setReplaceError(''); setReplaceFile(null); setEditingId(null); }}
                          disabled={hasPendingReplacement}
                          className="min-h-11 min-w-11 flex items-center justify-center rounded text-slate-400 hover:text-amber-600 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          aria-label={`Replace file for ${doc.name}`}
                          title={hasPendingReplacement ? 'Replacement already pending review' : 'Replace file'}
                        >
                          <RefreshCw size={14} aria-hidden="true" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteDoc(doc.id)}
                        disabled={deletingId === doc.id}
                        className="min-h-11 min-w-11 flex items-center justify-center rounded text-slate-400 hover:text-red-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        aria-label={`Delete ${doc.name}`}
                      >
                        {deletingId === doc.id ? (
                          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 size={14} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className={labelClass}>Document Name *</span>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className={labelClass}>Union Local</span>
                        <input
                          type="text"
                          value={editForm.union_local}
                          onChange={(e) => setEditForm({ ...editForm, union_local: e.target.value })}
                          className={inputClass}
                          placeholder="IATSE 317"
                        />
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 items-center">
                      <label className="block">
                        <span className={labelClass}>Document Type</span>
                        <select
                          value={editForm.doc_type}
                          onChange={(e) => setEditForm({ ...editForm, doc_type: e.target.value })}
                          className={inputClass}
                        >
                          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-4">
                        <input
                          type="checkbox"
                          checked={editForm.is_shared}
                          onChange={(e) => setEditForm({ ...editForm, is_shared: e.target.checked })}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                        Share with community
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(doc.id)}
                        disabled={saving || !editForm.name.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-11"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-11"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Replace file form */}
                {isReplacing && (
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    {doc.is_shared && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        This is a shared document. Your replacement will be reviewed by an admin before going live.
                        The current version stays active until approved.
                      </div>
                    )}
                    {replaceError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                        {replaceError}
                      </div>
                    )}
                    <div>
                      <span className={labelClass}>New File (PDF, TXT, MD)</span>
                      <input
                        ref={replaceFileRef}
                        type="file"
                        accept=".pdf,.txt,.md"
                        onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
                        className="mt-1 w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:text-slate-700 hover:file:bg-slate-200 focus:outline-none"
                        aria-label="Select replacement file"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={submitReplacement}
                        disabled={replacing || !replaceFile}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-11"
                      >
                        {replacing ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
                        {replacing ? (doc.is_shared ? 'Submitting...' : 'Processing...') : (doc.is_shared ? 'Submit for Review' : 'Replace & Reprocess')}
                      </button>
                      <button
                        onClick={() => { setReplacingId(null); setReplaceFile(null); setReplaceError(''); }}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-11"
                      >
                        Cancel
                      </button>
                    </div>
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
