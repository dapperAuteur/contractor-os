'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Clock, DollarSign, Car,
  FolderOpen, Phone, MessageSquare, Receipt,
  Trash2, Edit2, Check, X, Zap, Globe, Lock,
  FileText, AlertTriangle, BookOpen, ImageIcon, Plus, Copy, Users,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import JobStatusBadge from '@/components/contractor/JobStatusBadge';
import JobSummaryCards from '@/components/contractor/JobSummaryCards';
import QuickLogModal from '@/components/contractor/QuickLogModal';
import JobNoteForm from '@/components/contractor/JobNoteForm';
import JobNoteCard from '@/components/contractor/JobNoteCard';
import { offlineFetch } from '@/lib/offline/offline-fetch';
import ScanButton from '@/components/scan/ScanButton';
import type { ScanResult } from '@/components/scan/ScanButton';

/* ─── Types ─────────────────────────────────────────────── */
interface Job {
  id: string;
  job_number: string;
  client_name: string;
  event_name: string | null;
  location_name: string | null;
  poc_name: string | null;
  poc_phone: string | null;
  crew_coordinator_name: string | null;
  crew_coordinator_phone: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  pay_rate: number | null;
  ot_rate: number | null;
  dt_rate: number | null;
  rate_type: string;
  union_local: string | null;
  department: string | null;
  benefits_eligible: boolean;
  travel_benefits: Record<string, number>;
  benefit_deductions: { label: string; amount: number }[];
  est_pay_date: string | null;
  distance_from_home_miles: number | null;
  is_multi_day: boolean;
  scheduled_dates: string[];
  is_public: boolean;
  share_contacts: boolean;
  notes: string | null;
  event_id: string | null;
  _role: 'owner' | 'lister' | 'worker';
  _counts: {
    time_entries: number;
    invoices: number;
    trips: number;
    expenses: number;
    documents: number;
  };
}

interface BenefitLine { label: string; amount: number }

interface TimeEntry {
  id: string;
  work_date: string;
  time_in: string | null;
  time_out: string | null;
  adjusted_in: string | null;
  adjusted_out: string | null;
  total_hours: number | null;
  st_hours: number | null;
  ot_hours: number | null;
  dt_hours: number | null;
  meal_provided: boolean;
  invoice_id: string | null;
  notes: string | null;
  benefit_deductions: BenefitLine[];
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  status: string;
  total: number;
  invoice_date: string;
  custom_fields: Record<string, string>;
}

interface Summary {
  days_worked: number;
  total_hours: number;
  total_invoiced: number;
  total_paid: number;
  pending_invoices: number;
  total_miles: number;
  total_expenses: number;
  net_earnings: number;
}

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

interface Document {
  id: string;
  name: string;
  url: string;
  doc_type: string;
  doc_category: string | null;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface CrewMember {
  id: string;
  role: string;
  role_label: string | null;
  notes: string | null;
  created_at: string;
  user_contacts: {
    id: string;
    name: string;
    job_title: string | null;
    company_name: string | null;
    phone: string | null;
    email: string | null;
    contact_phones: Array<{ id: string; phone: string; label: string; is_primary: boolean }>;
    contact_emails: Array<{ id: string; email: string; label: string; is_primary: boolean }>;
  } | null;
}

interface SearchContact {
  id: string;
  name: string;
  company_name: string | null;
  job_title: string | null;
  phone: string | null;
}

const CREW_ROLE_OPTIONS = [
  { value: 'poc', label: 'Point of Contact' },
  { value: 'crew_coordinator', label: 'Crew Coordinator' },
  { value: 'tech_lead', label: 'Tech Lead' },
  { value: 'producer', label: 'Producer' },
  { value: 'eic', label: 'Engineer in Charge' },
  { value: 'a1', label: 'A1 (Audio)' },
  { value: 'a2', label: 'A2 (Audio)' },
  { value: 'v1', label: 'V1 (Video)' },
  { value: 'v2', label: 'V2 (Video)' },
  { value: 'graphics', label: 'Graphics' },
  { value: 'replay', label: 'Replay' },
  { value: 'utility', label: 'Utility' },
  { value: 'other', label: 'Other' },
];

const CREW_ROLE_LABELS: Record<string, string> = Object.fromEntries(CREW_ROLE_OPTIONS.map((r) => [r.value, r.label]));

const DOC_CATEGORIES = [
  { value: 'scan', label: 'Scan', icon: FileText },
  { value: 'incident_report', label: 'Incident Report', icon: AlertTriangle },
  { value: 'best_practice', label: 'Best Practice', icon: BookOpen },
  { value: 'note', label: 'Note', icon: FileText },
  { value: 'photo', label: 'Photo', icon: ImageIcon },
  { value: 'other', label: 'Other', icon: FolderOpen },
];

/* ─── Tabs ──────────────────────────────────────────────── */
const TABS = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'notes', label: 'Notes', icon: MessageSquare },
  { id: 'time', label: 'Time', icon: Clock },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'expenses', label: 'Expenses', icon: DollarSign },
  { id: 'mileage', label: 'Mileage', icon: Car },
  { id: 'documents', label: 'Docs', icon: FolderOpen },
  { id: 'contacts', label: 'Contacts', icon: Phone },
];

const STATUS_ORDER = ['assigned', 'confirmed', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled'];

function EntryBenefitEditor({
  rows, setRows, saving, onSave, onCancel, onCopyAll, entryCount,
}: {
  rows: { id: string; label: string; amount: string }[];
  setRows: (rows: { id: string; label: string; amount: string }[]) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onCopyAll: () => void;
  entryCount: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">Benefits for this date</p>
      {rows.map((row, i) => (
        <div key={row.id} className="flex items-center gap-2">
          <input
            type="text"
            value={row.label}
            onChange={(e) => { const u = [...rows]; u[i] = { ...row, label: e.target.value }; setRows(u); }}
            placeholder="Benefit name"
            aria-label="Benefit name"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <input
            type="number"
            step="0.01"
            value={row.amount}
            onChange={(e) => { const u = [...rows]; u[i] = { ...row, amount: e.target.value }; setRows(u); }}
            placeholder="0.00"
            aria-label="Benefit amount"
            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-right"
          />
          <button
            type="button"
            onClick={() => setRows(rows.filter((_, j) => j !== i))}
            className="flex items-center justify-center min-h-11 min-w-11 p-2 text-slate-400 hover:text-red-500 transition rounded-lg"
            aria-label={`Remove ${row.label || 'benefit'}`}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRows([...rows, { id: `new-${Date.now()}`, label: '', amount: '' }])}
          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-500 transition min-h-11 px-2"
        >
          <Plus className="w-3 h-3" aria-hidden="true" /> Add Line
        </button>
        <button type="button" onClick={onSave} disabled={saving} className="flex items-center gap-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-500 transition disabled:opacity-50 min-h-11">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Check className="w-3 h-3" aria-hidden="true" />}
          Save
        </button>
        {entryCount > 1 && rows.length > 0 && (
          <button type="button" onClick={onCopyAll} disabled={saving} className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition disabled:opacity-50 min-h-11">
            <Copy className="w-3 h-3" aria-hidden="true" />
            Copy to All Dates
          </button>
        )}
        <button type="button" onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-700 transition min-h-11 px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [jobNotes, setJobNotes] = useState<JobNote[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('time');
  const [generating, setGenerating] = useState(false);

  // Job-level benefit deductions inline editing
  const [editingBenefits, setEditingBenefits] = useState(false);
  const [editBenefits, setEditBenefits] = useState<{ id: string; label: string; amount: string }[]>([]);
  const [benefitsSaving, setBenefitsSaving] = useState(false);

  // Per-entry benefit editing
  const [editingEntryBenefits, setEditingEntryBenefits] = useState<string | null>(null); // entry ID
  const [entryBenefitRows, setEntryBenefitRows] = useState<{ id: string; label: string; amount: string }[]>([]);
  const [entryBenefitSaving, setEntryBenefitSaving] = useState(false);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [statusEditing, setStatusEditing] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [docForm, setDocForm] = useState({ title: '', category: 'note', description: '' });
  const [docSaving, setDocSaving] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);

  // Crew sheet state
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [crewSearch, setCrewSearch] = useState('');
  const [crewSearchResults, setCrewSearchResults] = useState<SearchContact[]>([]);
  const [crewSelectedContact, setCrewSelectedContact] = useState<string | null>(null);
  const [crewSelectedName, setCrewSelectedName] = useState('');
  const [crewRole, setCrewRole] = useState('poc');
  const [crewRoleLabel, setCrewRoleLabel] = useState('');
  const [crewSaving, setCrewSaving] = useState(false);

  const loadJob = useCallback(async () => {
    const [jobRes, summaryRes, timeRes, invoiceRes, docRes, notesRes, crewRes] = await Promise.all([
      offlineFetch(`/api/contractor/jobs/${id}`),
      offlineFetch(`/api/contractor/jobs/${id}/summary`),
      offlineFetch(`/api/contractor/jobs/${id}/time-entries`),
      offlineFetch(`/api/finance/invoices?job_id=${id}`),
      offlineFetch(`/api/contractor/jobs/${id}/documents`),
      offlineFetch(`/api/contractor/jobs/${id}/notes`),
      offlineFetch(`/api/contractor/jobs/${id}/crew`),
    ]);
    const [jobData, summaryData, timeData, invoiceData, docData, notesData, crewData] = await Promise.all([
      jobRes.json(), summaryRes.json(), timeRes.json(), invoiceRes.json(), docRes.json(), notesRes.json(), crewRes.json(),
    ]);
    setJob(jobData);
    setSummary(summaryData);
    setTimeEntries(timeData.time_entries ?? []);
    setInvoices(invoiceData.invoices ?? []);
    setDocuments(docData.documents ?? []);
    setJobNotes(notesData.notes ?? []);
    setCrewMembers(crewData.crew ?? []);
    if (jobData._current_user_id) setCurrentUserId(jobData._current_user_id);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadJob(); }, [loadJob]);

  /* ─── Time Entry Form ───────────────────────────────── */
  const [teForm, setTeForm] = useState({ work_date: '', time_in: '', time_out: '', total_hours: '', st_hours: '', ot_hours: '', notes: '' });
  const [teSaving, setTeSaving] = useState(false);
  const [bulkTemplate, setBulkTemplate] = useState({ total_hours: '', st_hours: '', ot_hours: '', notes: '' });
  const [bulkSaving, setBulkSaving] = useState(false);

  async function addTimeEntry(e: React.FormEvent) {
    e.preventDefault();
    setTeSaving(true);
    const res = await offlineFetch(`/api/contractor/jobs/${id}/time-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        work_date: teForm.work_date,
        total_hours: teForm.total_hours ? parseFloat(teForm.total_hours) : null,
        st_hours: teForm.st_hours ? parseFloat(teForm.st_hours) : null,
        ot_hours: teForm.ot_hours ? parseFloat(teForm.ot_hours) : null,
        notes: teForm.notes || null,
      }),
    });
    setTeSaving(false);
    if (res.ok) {
      setTeForm({ work_date: '', time_in: '', time_out: '', total_hours: '', st_hours: '', ot_hours: '', notes: '' });
      loadJob();
    }
  }

  async function deleteTimeEntry(entryId: string) {
    await offlineFetch(`/api/contractor/jobs/${id}/time-entries/${entryId}`, { method: 'DELETE' });
    loadJob();
  }

  async function bulkFillDates(e: React.FormEvent) {
    e.preventDefault();
    if (!job?.scheduled_dates?.length) return;
    // Only fill dates that don't already have an entry
    const existingDates = new Set(timeEntries.map((te) => te.work_date));
    const datesToFill = job.scheduled_dates.filter((d) => !existingDates.has(d));
    if (datesToFill.length === 0) return;
    setBulkSaving(true);
    await offlineFetch(`/api/contractor/jobs/${id}/time-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dates: datesToFill,
        total_hours: bulkTemplate.total_hours ? parseFloat(bulkTemplate.total_hours) : null,
        st_hours: bulkTemplate.st_hours ? parseFloat(bulkTemplate.st_hours) : null,
        ot_hours: bulkTemplate.ot_hours ? parseFloat(bulkTemplate.ot_hours) : null,
        notes: bulkTemplate.notes || null,
      }),
    });
    setBulkSaving(false);
    loadJob();
  }

  /* ─── Save Benefit Deductions ─────────────────────────── */
  async function saveBenefitDeductions() {
    setBenefitsSaving(true);
    const deductions = editBenefits
      .filter((d) => d.label.trim())
      .map((d) => ({ label: d.label.trim(), amount: parseFloat(d.amount) || 0 }));

    const res = await offlineFetch(`/api/contractor/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ benefit_deductions: deductions }),
    });

    if (res.ok) {
      setEditingBenefits(false);
      loadJob();
    }
    setBenefitsSaving(false);
  }

  /* ─── Per-Entry Benefit Deductions ────────────────────── */
  function openEntryBenefits(te: TimeEntry) {
    const existing = te.benefit_deductions?.length
      ? te.benefit_deductions
      : job?.benefit_deductions?.length
        ? job.benefit_deductions
        : [];
    setEntryBenefitRows(
      existing.map((d: BenefitLine, i: number) => ({
        id: `${i}`,
        label: d.label ?? '',
        amount: d.amount != null ? String(d.amount) : '',
      }))
    );
    setEditingEntryBenefits(te.id);
  }

  async function saveEntryBenefits(entryId: string) {
    setEntryBenefitSaving(true);
    const deductions = entryBenefitRows
      .filter((d) => d.label.trim())
      .map((d) => ({ label: d.label.trim(), amount: parseFloat(d.amount) || 0 }));

    await offlineFetch(`/api/contractor/jobs/${id}/time-entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ benefit_deductions: deductions }),
    });

    setEditingEntryBenefits(null);
    setEntryBenefitSaving(false);
    loadJob();
  }

  async function copyBenefitsToAllDates(sourceBenefits: BenefitLine[]) {
    if (!timeEntries.length) return;
    const confirmed = confirm(`Copy these benefits to all ${timeEntries.length} work dates?`);
    if (!confirmed) return;

    setEntryBenefitSaving(true);
    for (const te of timeEntries) {
      await offlineFetch(`/api/contractor/jobs/${id}/time-entries/${te.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benefit_deductions: sourceBenefits }),
      });
    }
    setEditingEntryBenefits(null);
    setEntryBenefitSaving(false);
    loadJob();
  }

  /* ─── Generate Invoice ──────────────────────────────── */
  async function generateInvoice(entryId?: string) {
    setGenerating(true);
    setFlash(null);
    try {
      const res = await offlineFetch(`/api/contractor/jobs/${id}/generate-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryId ? { entry_id: entryId } : {}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setFlash({ type: 'error', message: body?.error || 'Failed to generate invoice' });
      } else {
        setFlash({ type: 'success', message: 'Invoice generated successfully' });
        setTimeout(() => setFlash((f) => f?.type === 'success' ? null : f), 4000);
      }
    } catch {
      setFlash({ type: 'error', message: 'Network error — please try again' });
    }
    setGenerating(false);
    loadJob();
  }

  /* ─── Toggle Public / Share Contacts ────────────────── */
  async function togglePublic() {
    const newVal = !job?.is_public;
    setJob((prev) => prev ? { ...prev, is_public: newVal } : prev);
    await offlineFetch(`/api/contractor/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: newVal }),
    });
  }

  async function toggleShareContacts() {
    const newVal = !job?.share_contacts;
    setJob((prev) => prev ? { ...prev, share_contacts: newVal } : prev);
    await offlineFetch(`/api/contractor/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share_contacts: newVal }),
    });
  }

  /* ─── Status Update ─────────────────────────────────── */
  async function updateStatus() {
    await offlineFetch(`/api/contractor/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatusEditing(false);
    loadJob();
  }

  /* ─── Scan Handler ──────────────────────────────────── */
  function handleScanResult(result: ScanResult) {
    // Save scan result as a job document with metadata
    offlineFetch(`/api/contractor/jobs/${id}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Scan: ${result.documentType}`,
        doc_category: 'scan',
        doc_type: result.documentType,
        metadata: { extracted: result.extracted, prefills: result.prefills, confidence: result.confidence },
        url: result.imageUrl || null,
      }),
    }).then(() => loadJob());
  }

  /* ─── Duplicate Job ────────────────────────────────── */
  function handleDuplicate() {
    if (!job) return;
    const prefill = {
      client_name: job.client_name,
      event_name: job.event_name,
      location_name: job.location_name,
      poc_name: job.poc_name,
      poc_phone: job.poc_phone,
      crew_coordinator_name: job.crew_coordinator_name,
      crew_coordinator_phone: job.crew_coordinator_phone,
      pay_rate: job.pay_rate,
      ot_rate: job.ot_rate,
      dt_rate: job.dt_rate,
      rate_type: job.rate_type,
      union_local: job.union_local,
      department: job.department,
      benefits_eligible: job.benefits_eligible,
      travel_benefits: job.travel_benefits,
      distance_from_home_miles: job.distance_from_home_miles,
      notes: job.notes,
    };
    sessionStorage.setItem('duplicate_job_prefill', JSON.stringify(prefill));
    router.push('/dashboard/contractor/jobs/new?from=duplicate');
  }

  /* ─── Add Document ─────────────────────────────────── */
  async function addDocument(e: React.FormEvent) {
    e.preventDefault();
    setDocSaving(true);
    const res = await offlineFetch(`/api/contractor/jobs/${id}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: docForm.title,
        doc_category: docForm.category,
        description: docForm.description || null,
      }),
    });
    setDocSaving(false);
    if (res.ok) {
      setDocForm({ title: '', category: 'note', description: '' });
      setShowDocForm(false);
      loadJob();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-400" size={32} aria-label="Loading job details" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center text-slate-400">
        Job not found. <Link href="/dashboard/contractor" className="text-amber-400">Go back</Link>
      </div>
    );
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none';
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtTime = (ts: string | null) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      {/* Header */}
      <Link href="/dashboard/contractor" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 min-h-11 py-2" aria-label="Back to Jobs">
        <ArrowLeft size={14} aria-hidden="true" /> Jobs
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg text-amber-400">{job.job_number}</span>
            {job._role !== 'worker' && statusEditing ? (
              <div className="flex items-center gap-1">
                <select
                  className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  aria-label="Change job status"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
                <button onClick={updateStatus} className="p-2 text-green-400 hover:text-green-300 min-h-11 min-w-11 flex items-center justify-center" aria-label="Confirm status change"><Check size={16} /></button>
                <button onClick={() => setStatusEditing(false)} className="p-2 text-slate-400 hover:text-slate-700 min-h-11 min-w-11 flex items-center justify-center" aria-label="Cancel status change"><X size={16} /></button>
              </div>
            ) : job._role !== 'worker' ? (
              <button onClick={() => { setNewStatus(job.status); setStatusEditing(true); }} aria-label={`Change job status, currently ${job.status.replace('_', ' ')}`} className="min-h-11 flex items-center">
                <JobStatusBadge status={job.status} />
              </button>
            ) : (
              <JobStatusBadge status={job.status} />
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            {job.client_name}
            {job.event_name && <span className="text-slate-500 font-normal"> — {job.event_name}</span>}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400 mt-1">
            {job.location_name && <span>{job.location_name}</span>}
            {job.union_local && <span>{job.union_local}</span>}
            {job.department && <span>{job.department}</span>}
            {job.start_date && <span>{new Date(job.start_date + 'T00:00').toLocaleDateString()}{job.end_date && job.end_date !== job.start_date ? ` – ${new Date(job.end_date + 'T00:00').toLocaleDateString()}` : ''}</span>}
            {job.pay_rate && <span>{fmt(job.pay_rate)}/hr</span>}
            {job.est_pay_date && <span>Est. pay: {new Date(job.est_pay_date + 'T00:00').toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setQuickLogOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-amber-500 min-h-11"
            aria-label="Quick log hours, expenses, and mileage"
          >
            <Zap size={14} aria-hidden="true" /> Quick Log
          </button>
          {job._role !== 'worker' && (
            <>
              <Link
                href={`/dashboard/contractor/jobs/${id}/edit`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-11"
                aria-label="Edit job details"
              >
                <Edit2 size={14} aria-hidden="true" /> Edit
              </Link>
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-11"
                aria-label="Duplicate this job"
                title="Duplicate job"
              >
                <Copy size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>
              <button
                onClick={togglePublic}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  job.is_public
                    ? 'border-green-600/50 text-green-400 hover:bg-green-600/10'
                    : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                }`}
                aria-label={job.is_public ? 'Job is public — click to make private' : 'Job is private — click to post on board'}
                title={job.is_public ? 'Posted on board — click to make private' : 'Click to post on job board'}
              >
                {job.is_public ? <Globe size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
                <span className="hidden sm:inline">{job.is_public ? 'Public' : 'Private'}</span>
              </button>
            </>
          )}
          {job._role === 'worker' && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              Assigned Worker
            </span>
          )}
        </div>

        {/* Share controls — shown when job is public (owner/lister only) */}
        {job.is_public && job._role !== 'worker' && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>This job is visible on the board.</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={job.share_contacts}
                onChange={toggleShareContacts}
                className="rounded border-slate-300 bg-slate-100 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-50"
                aria-label="Share contacts with accepted replacement"
              />
              <span className="text-slate-500">Share contacts when accepted</span>
            </label>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {summary && <JobSummaryCards summary={summary} />}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-0" role="tablist" aria-label="Job details sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors min-h-11 ${
              tab === t.id
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <t.icon size={14} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}

      {tab === 'details' && (
        <div className="space-y-4">
          {/* Pay & Rates */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Pay Rates</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 text-sm">
              <div><dt className="text-slate-500">ST Rate</dt><dd className="font-medium text-slate-900">{job.pay_rate ? fmt(job.pay_rate) : '—'}</dd></div>
              <div><dt className="text-slate-500">OT Rate</dt><dd className="font-medium text-slate-900">{job.ot_rate ? fmt(job.ot_rate) : '—'}</dd></div>
              <div><dt className="text-slate-500">DT Rate</dt><dd className="font-medium text-slate-900">{job.dt_rate ? fmt(job.dt_rate) : '—'}</dd></div>
              <div><dt className="text-slate-500">Rate Type</dt><dd className="font-medium text-slate-900 capitalize">{job.rate_type || '—'}</dd></div>
              <div><dt className="text-slate-500">Union Local</dt><dd className="font-medium text-slate-900">{job.union_local || '—'}</dd></div>
              <div><dt className="text-slate-500">Department</dt><dd className="font-medium text-slate-900">{job.department || '—'}</dd></div>
              <div><dt className="text-slate-500">Est. Pay Date</dt><dd className="font-medium text-slate-900">{job.est_pay_date ? new Date(job.est_pay_date + 'T00:00').toLocaleDateString() : '—'}</dd></div>
              <div><dt className="text-slate-500">Distance</dt><dd className="font-medium text-slate-900">{job.distance_from_home_miles != null ? `${job.distance_from_home_miles} mi` : '—'}</dd></div>
            </dl>
          </div>

          {/* Travel Benefits */}
          {(Object.keys(job.travel_benefits ?? {}).length > 0 || job.benefits_eligible) && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Travel Benefits</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 text-sm">
                {job.travel_benefits?.per_diem != null && (
                  <div><dt className="text-slate-500">Per Diem</dt><dd className="font-medium text-slate-900">{fmt(job.travel_benefits.per_diem)}/day</dd></div>
                )}
                {job.travel_benefits?.mileage_rate != null && (
                  <div><dt className="text-slate-500">Mileage</dt><dd className="font-medium text-slate-900">${job.travel_benefits.mileage_rate}/mi</dd></div>
                )}
                {job.travel_benefits?.meal_allowance != null && (
                  <div><dt className="text-slate-500">Meal Allow.</dt><dd className="font-medium text-slate-900">{fmt(job.travel_benefits.meal_allowance)}</dd></div>
                )}
                {job.travel_benefits?.extra_pay != null && (
                  <div><dt className="text-slate-500">Extra Pay</dt><dd className="font-medium text-slate-900">{fmt(job.travel_benefits.extra_pay)}</dd></div>
                )}
              </dl>
            </div>
          )}

          {/* Benefit Deductions — inline editable */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Employer Benefit Contributions</h3>
              <button
                type="button"
                onClick={() => {
                  if (editingBenefits) {
                    // Save
                    saveBenefitDeductions();
                  } else {
                    // Enter edit mode
                    setEditBenefits(
                      (job.benefit_deductions ?? []).map((d, i) => ({
                        id: `${i}`,
                        label: d.label,
                        amount: String(d.amount ?? 0),
                      }))
                    );
                    setEditingBenefits(true);
                  }
                }}
                disabled={benefitsSaving}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-500 transition min-h-11 px-2"
                aria-label={editingBenefits ? 'Save benefit changes' : 'Edit benefits'}
              >
                {benefitsSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                ) : editingBenefits ? (
                  <Check className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <Edit2 className="w-3 h-3" aria-hidden="true" />
                )}
                {editingBenefits ? 'Save' : 'Edit'}
              </button>
            </div>

            {editingBenefits ? (
              <div className="space-y-2">
                {editBenefits.map((ded, i) => (
                  <div key={ded.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ded.label}
                      onChange={(e) => {
                        const updated = [...editBenefits];
                        updated[i] = { ...ded, label: e.target.value };
                        setEditBenefits(updated);
                      }}
                      placeholder="Benefit name"
                      aria-label="Benefit name"
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={ded.amount}
                      onChange={(e) => {
                        const updated = [...editBenefits];
                        updated[i] = { ...ded, amount: e.target.value };
                        setEditBenefits(updated);
                      }}
                      placeholder="0.00"
                      aria-label="Benefit amount"
                      className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setEditBenefits(editBenefits.filter((_, j) => j !== i))}
                      className="flex items-center justify-center min-h-11 min-w-11 p-2 text-slate-400 hover:text-red-500 transition rounded-lg"
                      aria-label={`Remove ${ded.label || 'benefit'}`}
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditBenefits([...editBenefits, { id: `new-${Date.now()}`, label: '', amount: '' }])}
                    className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-500 transition min-h-11 px-2"
                  >
                    <Plus className="w-3 h-3" aria-hidden="true" /> Add Benefit
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBenefits(false)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition min-h-11 px-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (job.benefit_deductions?.length ?? 0) > 0 ? (
              <div className="space-y-1.5">
                {job.benefit_deductions.map((ded, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700">{ded.label}</span>
                    <span className="font-medium text-slate-900">{fmt(ded.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-2 mt-2">
                  <span className="font-semibold text-slate-800">Est. Benefits Total</span>
                  <span className="font-bold text-slate-900">
                    {fmt(job.benefit_deductions.reduce((s, d) => s + (d.amount ?? 0), 0))}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No benefit contributions. Click Edit to add.</p>
            )}
          </div>

          {/* Contacts */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Contacts</h3>
            <dl className="grid grid-cols-1 gap-y-2 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-slate-500">Point of Contact</dt>
                <dd className="font-medium text-slate-900">{job.poc_name || '—'}</dd>
                {job.poc_phone && <dd className="text-slate-500">{job.poc_phone}</dd>}
              </div>
              <div>
                <dt className="text-slate-500">Crew Coordinator</dt>
                <dd className="font-medium text-slate-900">{job.crew_coordinator_name || '—'}</dd>
                {job.crew_coordinator_phone && <dd className="text-slate-500">{job.crew_coordinator_phone}</dd>}
              </div>
            </dl>
          </div>

          {/* Notes */}
          {job.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Notes</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-4">
          <JobNoteForm jobId={id} onNoteCreated={loadJob} />
          {jobNotes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No notes yet. Add the first note above.</p>
          ) : (
            <div className="space-y-3" role="list" aria-label="Job notes">
              {jobNotes.map((note) => (
                <div key={note.id} role="listitem">
                  <JobNoteCard note={note} currentUserId={currentUserId} jobId={id} onUpdated={loadJob} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {flash && (
        <div role="alert" className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium ${flash.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{flash.message}</span>
          <button onClick={() => setFlash(null)} className="ml-3 min-h-11 min-w-11 flex items-center justify-center text-current opacity-60 hover:opacity-100" aria-label="Dismiss">✕</button>
        </div>
      )}

      {tab === 'time' && (
        <div className="space-y-4">
          {/* Multi-day bulk fill */}
          {job.is_multi_day && job.scheduled_dates?.length ? (() => {
            const scheduledDates = job.scheduled_dates;
            const existingDates = new Set(timeEntries.map((te) => te.work_date));
            const unfilled = scheduledDates.filter((d) => !existingDates.has(d));
            return unfilled.length > 0 ? (
              <form onSubmit={bulkFillDates} className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3" aria-label="Bulk fill all dates">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-amber-800">
                    Fill {unfilled.length} remaining date{unfilled.length !== 1 ? 's' : ''} at once
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs text-amber-700 mb-1">Total Hrs</label>
                    <input type="number" step="0.25" className={inputClass} value={bulkTemplate.total_hours} onChange={(e) => setBulkTemplate(p => ({ ...p, total_hours: e.target.value }))} aria-label="Bulk total hours" />
                  </div>
                  <div>
                    <label className="block text-xs text-amber-700 mb-1">ST Hrs</label>
                    <input type="number" step="0.25" className={inputClass} value={bulkTemplate.st_hours} onChange={(e) => setBulkTemplate(p => ({ ...p, st_hours: e.target.value }))} aria-label="Bulk straight time hours" />
                  </div>
                  <div>
                    <label className="block text-xs text-amber-700 mb-1">OT Hrs</label>
                    <input type="number" step="0.25" className={inputClass} value={bulkTemplate.ot_hours} onChange={(e) => setBulkTemplate(p => ({ ...p, ot_hours: e.target.value }))} aria-label="Bulk overtime hours" />
                  </div>
                  <div>
                    <label className="block text-xs text-amber-700 mb-1">Notes</label>
                    <input className={inputClass} placeholder="Optional" value={bulkTemplate.notes} onChange={(e) => setBulkTemplate(p => ({ ...p, notes: e.target.value }))} aria-label="Bulk notes" />
                  </div>
                </div>
                <button type="submit" disabled={bulkSaving} className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11 w-full sm:w-auto">
                  {bulkSaving ? <Loader2 size={14} className="animate-spin" aria-label="Saving" /> : `Apply to ${unfilled.length} date${unfilled.length !== 1 ? 's' : ''}`}
                </button>
              </form>
            ) : null;
          })() : null}

          {/* Add Time Entry Form */}
          <form onSubmit={addTimeEntry} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3" aria-label="Add time entry">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-end lg:gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="te-date" className="block text-sm text-slate-500 mb-1">Date <span aria-hidden="true">*</span></label>
                <input id="te-date" type="date" className={inputClass} value={teForm.work_date} onChange={(e) => setTeForm(p => ({ ...p, work_date: e.target.value }))} required aria-required="true" />
              </div>
              <div>
                <label htmlFor="te-total" className="block text-sm text-slate-500 mb-1">Total Hrs</label>
                <input id="te-total" type="number" step="0.25" className={inputClass} value={teForm.total_hours} onChange={(e) => setTeForm(p => ({ ...p, total_hours: e.target.value }))} aria-label="Total hours" />
              </div>
              <div>
                <label htmlFor="te-st" className="block text-sm text-slate-500 mb-1">ST Hrs</label>
                <input id="te-st" type="number" step="0.25" className={inputClass} value={teForm.st_hours} onChange={(e) => setTeForm(p => ({ ...p, st_hours: e.target.value }))} aria-label="Straight time hours" />
              </div>
              <div>
                <label htmlFor="te-ot" className="block text-sm text-slate-500 mb-1">OT Hrs</label>
                <input id="te-ot" type="number" step="0.25" className={inputClass} value={teForm.ot_hours} onChange={(e) => setTeForm(p => ({ ...p, ot_hours: e.target.value }))} aria-label="Overtime hours" />
              </div>
              <div className="col-span-2 sm:col-span-1 sm:flex-1 sm:min-w-30">
                <label htmlFor="te-notes" className="block text-sm text-slate-500 mb-1">Notes</label>
                <input id="te-notes" className={inputClass} placeholder="Optional" value={teForm.notes} onChange={(e) => setTeForm(p => ({ ...p, notes: e.target.value }))} aria-label="Time entry notes" />
              </div>
            </div>
            <button type="submit" disabled={teSaving} className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11 w-full sm:w-auto">
              {teSaving ? <Loader2 size={14} className="animate-spin" aria-label="Saving" /> : 'Add Entry'}
            </button>
          </form>

          {/* Time Entries List */}
          {timeEntries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No time entries yet.</p>
          ) : (
            <>
            {/* Mobile card view */}
            <div className="space-y-2 lg:hidden">
              {timeEntries.map((te) => (
                <div key={te.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">{new Date(te.work_date + 'T00:00').toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      {te.invoice_id ? (
                        <Link href={`/dashboard/finance/invoices/${te.invoice_id}`} className="text-xs text-green-400 hover:underline px-2 py-1" aria-label="View invoice">View Invoice</Link>
                      ) : (
                        <button onClick={() => generateInvoice(te.id)} disabled={generating} className="text-xs text-amber-400 hover:underline px-2 py-1 min-h-11 flex items-center" aria-label={`Generate invoice for ${new Date(te.work_date + 'T00:00').toLocaleDateString()}`}>
                          Generate
                        </button>
                      )}
                      <button onClick={() => deleteTimeEntry(te.id)} className="p-2 text-slate-400 hover:text-red-400 min-h-11 min-w-11 flex items-center justify-center" aria-label={`Delete time entry for ${new Date(te.work_date + 'T00:00').toLocaleDateString()}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><span className="text-slate-400 text-xs">Total</span><div className="text-slate-900 font-medium">{te.total_hours ?? '—'}h</div></div>
                    <div><span className="text-slate-400 text-xs">ST</span><div className="text-slate-500">{te.st_hours ?? '—'}h</div></div>
                    <div><span className="text-slate-400 text-xs">OT</span><div className="text-slate-500">{te.ot_hours ?? '—'}h</div></div>
                  </div>
                  {(te.time_in || te.time_out) && (
                    <div className="text-xs text-slate-400">
                      {fmtTime(te.adjusted_in || te.time_in)} – {fmtTime(te.adjusted_out || te.time_out)}
                    </div>
                  )}

                  {/* Per-entry benefits */}
                  {(te.benefit_deductions?.length > 0 || editingEntryBenefits === te.id) && (
                    <div className="border-t border-slate-100 pt-2 mt-2">
                      {editingEntryBenefits === te.id ? (
                        <EntryBenefitEditor
                          rows={entryBenefitRows}
                          setRows={setEntryBenefitRows}
                          saving={entryBenefitSaving}
                          onSave={() => saveEntryBenefits(te.id)}
                          onCancel={() => setEditingEntryBenefits(null)}
                          onCopyAll={() => {
                            const deductions = entryBenefitRows
                              .filter((d) => d.label.trim())
                              .map((d) => ({ label: d.label.trim(), amount: parseFloat(d.amount) || 0 }));
                            copyBenefitsToAllDates(deductions);
                          }}
                          entryCount={timeEntries.length}
                        />
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">Benefits</span>
                            <button onClick={() => openEntryBenefits(te)} className="text-xs text-amber-600 hover:text-amber-500 min-h-11 px-1" aria-label="Edit benefits for this date">
                              <Edit2 className="w-3 h-3 inline" aria-hidden="true" /> Edit
                            </button>
                          </div>
                          {te.benefit_deductions.map((b, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-slate-600">{b.label}</span>
                              <span className="text-slate-900">{fmt(b.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {!(te.benefit_deductions?.length > 0) && editingEntryBenefits !== te.id && (
                    <button onClick={() => openEntryBenefits(te)} className="text-xs text-amber-600 hover:text-amber-500 mt-2 min-h-11 flex items-center gap-1" aria-label="Add benefits for this date">
                      <Plus size={12} aria-hidden="true" /> Add Benefits
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Desktop table view */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm" aria-label="Time entries">
                <thead className="text-slate-400 text-xs border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left">Date</th>
                    <th scope="col" className="px-3 py-2 text-right">In</th>
                    <th scope="col" className="px-3 py-2 text-right">Out</th>
                    <th scope="col" className="px-3 py-2 text-right">Total</th>
                    <th scope="col" className="px-3 py-2 text-right">ST</th>
                    <th scope="col" className="px-3 py-2 text-right">OT</th>
                    <th scope="col" className="px-3 py-2 text-center">Invoice</th>
                    <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((te) => (
                    <React.Fragment key={te.id}>
                    <tr className="border-b border-slate-200/50 hover:bg-slate-100/30">
                      <td className="px-3 py-2 text-slate-900">{new Date(te.work_date + 'T00:00').toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{fmtTime(te.adjusted_in || te.time_in)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{fmtTime(te.adjusted_out || te.time_out)}</td>
                      <td className="px-3 py-2 text-right text-slate-900 font-medium">{te.total_hours ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{te.st_hours ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{te.ot_hours ?? '—'}</td>
                      <td className="px-3 py-2 text-center">
                        {te.invoice_id ? (
                          <Link href={`/dashboard/finance/invoices/${te.invoice_id}`} className="text-xs text-green-400 hover:underline" aria-label="View invoice">View</Link>
                        ) : (
                          <button
                            onClick={() => generateInvoice(te.id)}
                            disabled={generating}
                            className="text-xs text-amber-400 hover:underline disabled:opacity-50"
                            aria-label={`Generate invoice for ${new Date(te.work_date + 'T00:00').toLocaleDateString()}`}
                          >
                            Generate
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEntryBenefits(te)} className="p-2 text-slate-400 hover:text-amber-500 min-h-11 min-w-11 flex items-center justify-center" aria-label={`Edit benefits for ${new Date(te.work_date + 'T00:00').toLocaleDateString()}`}>
                            <DollarSign size={14} />
                          </button>
                          <button onClick={() => deleteTimeEntry(te.id)} className="p-2 text-slate-400 hover:text-red-400 min-h-11 min-w-11 flex items-center justify-center" aria-label={`Delete time entry for ${new Date(te.work_date + 'T00:00').toLocaleDateString()}`}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Per-entry benefits expandable row */}
                    {editingEntryBenefits === te.id && (
                      <tr>
                        <td colSpan={8} className="px-3 py-3 bg-slate-50">
                          <EntryBenefitEditor
                            rows={entryBenefitRows}
                            setRows={setEntryBenefitRows}
                            saving={entryBenefitSaving}
                            onSave={() => saveEntryBenefits(te.id)}
                            onCancel={() => setEditingEntryBenefits(null)}
                            onCopyAll={() => {
                              const deductions = entryBenefitRows
                                .filter((d) => d.label.trim())
                                .map((d) => ({ label: d.label.trim(), amount: parseFloat(d.amount) || 0 }));
                              copyBenefitsToAllDates(deductions);
                            }}
                            entryCount={timeEntries.length}
                          />
                        </td>
                      </tr>
                    )}
                    {editingEntryBenefits !== te.id && te.benefit_deductions?.length > 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 pb-2">
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                            {te.benefit_deductions.map((b, i) => (
                              <span key={i}>{b.label}: <span className="text-slate-700 font-medium">{fmt(b.amount)}</span></span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}

          {/* Bulk Generate */}
          {timeEntries.some((te) => !te.invoice_id) && (
            <button
              onClick={() => generateInvoice()}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg border border-amber-600/50 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-600/10 disabled:opacity-50 min-h-11"
              aria-label="Generate invoices for all uninvoiced time entries"
            >
              <Receipt size={14} aria-hidden="true" />
              {generating ? 'Generating...' : 'Generate All Invoices'}
            </button>
          )}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="space-y-2">
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No invoices linked to this job.</p>
          ) : (
            invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/dashboard/finance/invoices/${inv.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300"
              >
                <div>
                  <span className="font-mono text-sm text-slate-900">{inv.invoice_number || inv.id.slice(0, 8)}</span>
                  <span className={`ml-2 text-xs ${inv.status === 'paid' ? 'text-green-400' : inv.status === 'draft' ? 'text-slate-400' : 'text-yellow-400'}`}>
                    {inv.status}
                  </span>
                  {inv.custom_fields?.work_date && (
                    <span className="ml-2 text-xs text-slate-400">{inv.custom_fields.work_date}</span>
                  )}
                </div>
                <span className="text-slate-900 font-medium">{fmt(inv.total)}</span>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 'expenses' && (
        <div className="text-center py-6">
          <p className="text-sm text-slate-400 mb-2">View expenses linked to this job in the Finance module.</p>
          <Link href={`/dashboard/finance?job_id=${id}`} className="text-sm text-amber-400 hover:underline">
            Open Finance <DollarSign size={12} className="inline" aria-hidden="true" />
          </Link>
        </div>
      )}

      {tab === 'mileage' && (
        <div className="text-center py-6">
          <p className="text-sm text-slate-400 mb-2">View trips linked to this job in the Travel module.</p>
          <Link href={`/dashboard/travel?job_id=${id}`} className="text-sm text-amber-400 hover:underline">
            Open Travel <Car size={12} className="inline" aria-hidden="true" />
          </Link>
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-4">
          {/* Scan button for this job */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-medium text-slate-800 mb-3">Scan Document</h3>
            <ScanButton onResult={handleScanResult} />
            <p className="text-xs text-slate-400 mt-2">Scan pay stubs, call sheets, invoices, or receipts. Extracted data is saved to this job.</p>
          </div>

          {/* Add document form */}
          {showDocForm ? (
            <form onSubmit={addDocument} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3" aria-label="Add document">
              <div>
                <label htmlFor="doc-title" className="block text-sm text-slate-500 mb-1">Title</label>
                <input id="doc-title" className={inputClass} value={docForm.title} onChange={(e) => setDocForm(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <div>
                <label htmlFor="doc-category" className="block text-sm text-slate-500 mb-1">Category</label>
                <select id="doc-category" className={inputClass} value={docForm.category} onChange={(e) => setDocForm(p => ({ ...p, category: e.target.value }))}>
                  {DOC_CATEGORIES.filter(c => c.value !== 'scan').map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="doc-desc" className="block text-sm text-slate-500 mb-1">Description</label>
                <textarea id="doc-desc" className={inputClass} rows={3} value={docForm.description} onChange={(e) => setDocForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={docSaving} className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11">
                  {docSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                </button>
                <button type="button" onClick={() => setShowDocForm(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 min-h-11">Cancel</button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowDocForm(true)}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:border-amber-600 hover:text-amber-400 min-h-11 w-full justify-center"
            >
              <Plus size={14} aria-hidden="true" /> Add Note / Incident Report
            </button>
          )}

          {/* Document list */}
          {documents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No documents yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const cat = DOC_CATEGORIES.find(c => c.value === (doc.doc_category || doc.doc_type));
                const CatIcon = cat?.icon || FileText;
                return (
                  <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <CatIcon size={16} className="text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {doc.url ? (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-amber-400 hover:underline truncate">
                              {doc.title || doc.name}
                            </a>
                          ) : (
                            <span className="text-sm font-medium text-slate-900 truncate">{doc.title || doc.name}</span>
                          )}
                          <span className="text-xs text-slate-400 shrink-0">{cat?.label || doc.doc_type}</span>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-slate-500 mt-1">{doc.description}</p>
                        )}
                        {doc.metadata && doc.doc_category === 'scan' && (
                          <details className="mt-2">
                            <summary className="text-xs text-amber-400 cursor-pointer hover:underline">View extracted data</summary>
                            <pre className="mt-1 text-xs text-slate-500 bg-slate-100 rounded-lg p-3 overflow-x-auto max-h-40">
                              {JSON.stringify(doc.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                        <span className="text-xs text-slate-400 mt-1 block">{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'contacts' && (
        <div className="space-y-4">
          {/* Legacy POC & Coordinator from job fields */}
          {(job.poc_name || job.crew_coordinator_name) && (
            <div className="space-y-2">
              {job.poc_name && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                  <div>
                    <div className="text-xs text-slate-400">Point of Contact</div>
                    <div className="text-slate-900 font-medium">{job.poc_name}</div>
                  </div>
                  {job.poc_phone && (
                    <div className="flex gap-2">
                      <a href={`tel:${job.poc_phone}`} className="rounded-full bg-slate-100 p-3 text-slate-500 hover:text-green-400 min-h-11 min-w-11 flex items-center justify-center" aria-label={`Call ${job.poc_name}`}>
                        <Phone size={16} aria-hidden="true" />
                      </a>
                      <a href={`sms:${job.poc_phone}`} className="rounded-full bg-slate-100 p-3 text-slate-500 hover:text-blue-400 min-h-11 min-w-11 flex items-center justify-center" aria-label={`Text ${job.poc_name}`}>
                        <MessageSquare size={16} aria-hidden="true" />
                      </a>
                    </div>
                  )}
                </div>
              )}
              {job.crew_coordinator_name && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                  <div>
                    <div className="text-xs text-slate-400">Crew Coordinator</div>
                    <div className="text-slate-900 font-medium">{job.crew_coordinator_name}</div>
                  </div>
                  {job.crew_coordinator_phone && (
                    <div className="flex gap-2">
                      <a href={`tel:${job.crew_coordinator_phone}`} className="rounded-full bg-slate-100 p-3 text-slate-500 hover:text-green-400 min-h-11 min-w-11 flex items-center justify-center" aria-label={`Call ${job.crew_coordinator_name}`}>
                        <Phone size={16} aria-hidden="true" />
                      </a>
                      <a href={`sms:${job.crew_coordinator_phone}`} className="rounded-full bg-slate-100 p-3 text-slate-500 hover:text-blue-400 min-h-11 min-w-11 flex items-center justify-center" aria-label={`Text ${job.crew_coordinator_name}`}>
                        <MessageSquare size={16} aria-hidden="true" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Crew Sheet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Users size={14} className="text-slate-400" aria-hidden="true" /> Crew & Contacts
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCrew(true)}
                className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-500 min-h-11"
                aria-label="Add crew member"
              >
                <Plus size={14} aria-hidden="true" /> Add
              </button>
            </div>

            {crewMembers.length === 0 && !job.poc_name && !job.crew_coordinator_name ? (
              <p className="text-sm text-slate-400 text-center py-6">No contacts or crew members for this job.</p>
            ) : crewMembers.length === 0 ? null : (
              <div className="space-y-2">
                {crewMembers.map((cm) => {
                  const contact = cm.user_contacts;
                  const name = contact?.name ?? 'Unknown';
                  const phone = contact?.contact_phones?.find((p) => p.is_primary)?.phone
                    ?? contact?.contact_phones?.[0]?.phone ?? contact?.phone;
                  return (
                    <div key={cm.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            {cm.role_label ?? CREW_ROLE_LABELS[cm.role] ?? cm.role}
                          </span>
                        </div>
                        <Link
                          href={`/dashboard/contractor/contacts/${contact?.id}`}
                          className="mt-0.5 text-slate-900 font-medium hover:text-amber-600 transition-colors"
                        >
                          {name}
                        </Link>
                        {contact?.company_name && (
                          <div className="text-xs text-slate-400">{contact.company_name}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {phone && (
                          <>
                            <a href={`tel:${phone}`} className="rounded-full bg-slate-100 p-2.5 text-slate-500 hover:text-green-500 min-h-11 min-w-11 flex items-center justify-center" aria-label={`Call ${name}`}>
                              <Phone size={14} aria-hidden="true" />
                            </a>
                            <a href={`sms:${phone}`} className="rounded-full bg-slate-100 p-2.5 text-slate-500 hover:text-blue-500 min-h-11 min-w-11 flex items-center justify-center" aria-label={`Text ${name}`}>
                              <MessageSquare size={14} aria-hidden="true" />
                            </a>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            await offlineFetch(`/api/contractor/jobs/${id}/crew?role_id=${cm.id}`, { method: 'DELETE' });
                            loadJob();
                          }}
                          className="rounded-full p-2.5 text-slate-300 hover:text-red-500 min-h-11 min-w-11 flex items-center justify-center"
                          aria-label={`Remove ${name} from crew`}
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Crew Member Modal */}
          <Modal
            isOpen={showAddCrew}
            onClose={() => {
              setShowAddCrew(false);
              setCrewSearch('');
              setCrewSearchResults([]);
              setCrewSelectedContact(null);
              setCrewSelectedName('');
              setCrewRole('poc');
              setCrewRoleLabel('');
            }}
            title="Add Crew Member"
            size="sm"
          >
            <div className="space-y-4 p-4">
              {/* Contact search */}
              <div>
                <label htmlFor="crew-search" className="block text-sm font-medium text-slate-700 mb-1">Search Contacts</label>
                <input
                  id="crew-search"
                  type="text"
                  value={crewSearch}
                  onChange={async (e) => {
                    setCrewSearch(e.target.value);
                    if (e.target.value.trim().length >= 2) {
                      const res = await offlineFetch(`/api/contractor/contacts?search=${encodeURIComponent(e.target.value.trim())}&limit=10`);
                      const data = await res.json();
                      setCrewSearchResults(data.contacts ?? []);
                    } else {
                      setCrewSearchResults([]);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="Type to search..."
                />
                {crewSearchResults.length > 0 && !crewSelectedContact && (
                  <div className="mt-1 rounded-lg border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                    {crewSearchResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCrewSelectedContact(c.id);
                          setCrewSelectedName(c.name);
                          setCrewSearch(c.name);
                          setCrewSearchResults([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 min-h-11"
                      >
                        <div className="font-medium text-slate-900">{c.name}</div>
                        {c.company_name && <div className="text-xs text-slate-400">{c.company_name}</div>}
                      </button>
                    ))}
                  </div>
                )}
                {crewSelectedContact && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm text-amber-600 font-medium">{crewSelectedName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCrewSelectedContact(null);
                        setCrewSelectedName('');
                        setCrewSearch('');
                      }}
                      className="text-slate-400 hover:text-red-500"
                      aria-label="Clear selection"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              {/* Role select */}
              <div>
                <label htmlFor="crew-role" className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  id="crew-role"
                  value={crewRole}
                  onChange={(e) => setCrewRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  {CREW_ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {crewRole === 'other' && (
                <div>
                  <label htmlFor="crew-role-label" className="block text-sm font-medium text-slate-700 mb-1">Custom Role Name</label>
                  <input
                    id="crew-role-label"
                    type="text"
                    value={crewRoleLabel}
                    onChange={(e) => setCrewRoleLabel(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="Role name"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCrew(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 min-h-11"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!crewSelectedContact || crewSaving}
                  onClick={async () => {
                    if (!crewSelectedContact) return;
                    setCrewSaving(true);
                    await offlineFetch(`/api/contractor/jobs/${id}/crew`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contact_id: crewSelectedContact,
                        role: crewRole,
                        role_label: crewRole === 'other' ? crewRoleLabel.trim() || null : null,
                      }),
                    });
                    setCrewSaving(false);
                    setShowAddCrew(false);
                    setCrewSearch('');
                    setCrewSelectedContact(null);
                    setCrewSelectedName('');
                    setCrewRole('poc');
                    setCrewRoleLabel('');
                    loadJob();
                  }}
                  className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 min-h-11"
                >
                  {crewSaving ? 'Adding...' : 'Add to Crew'}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* Quick Log Modal */}
      <QuickLogModal
        isOpen={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        jobId={id}
        jobNumber={job.job_number}
        onLogged={loadJob}
      />
    </div>
  );
}
