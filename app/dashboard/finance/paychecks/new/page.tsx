'use client';

// app/dashboard/finance/paychecks/new/page.tsx
// Create a paycheck by selecting a job and its invoices.

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { ChevronLeft, Loader2, Banknote, AlertTriangle } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Job { id: string; job_number: string; client_name: string; event_name: string | null; }
interface Invoice { id: string; invoice_number: string | null; total: number; invoice_date: string; status: string; paycheck_id: string | null; }

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';

function CreatePaycheckForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedJobId = searchParams.get('job_id');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState(preselectedJobId ?? '');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [payDate, setPayDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [paycheckNumber, setPaycheckNumber] = useState('');
  const [grossOverride, setGrossOverride] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load jobs
  useEffect(() => {
    offlineFetch('/api/contractor/jobs?limit=200')
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => {});
  }, []);

  // Load invoices when job changes
  useEffect(() => {
    if (!jobId) { setInvoices([]); return; }
    setLoadingInvoices(true);
    offlineFetch(`/api/finance/invoices?job_id=${jobId}&limit=100`)
      .then((r) => r.json())
      .then((d) => {
        const all = (d.invoices ?? []) as Invoice[];
        const available = all.filter((inv: Invoice) => !inv.paycheck_id);
        setInvoices(available);
        setSelectedIds(new Set(available.map((inv: Invoice) => inv.id)));

        // Auto-fill dates from invoices
        const dates = available.map((inv: Invoice) => inv.invoice_date).filter(Boolean).sort();
        if (dates.length > 0) {
          setPeriodStart(dates[0]);
          setPeriodEnd(dates[dates.length - 1]);
        }
      })
      .finally(() => setLoadingInvoices(false));
  }, [jobId]);

  const expectedGross = invoices
    .filter((inv) => selectedIds.has(inv.id))
    .reduce((sum, inv) => sum + Number(inv.total ?? 0), 0);

  const actualGross = grossOverride ? parseFloat(grossOverride) : expectedGross;
  const variance = Math.round((actualGross - expectedGross) * 100) / 100;

  const toggleInvoice = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  async function handleCreate() {
    if (!jobId || selectedIds.size === 0 || !payDate) {
      setError('Select a job, at least one invoice, and a pay date');
      return;
    }
    setSaving(true);
    setError('');
    const res = await offlineFetch('/api/finance/paychecks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        invoice_ids: [...selectedIds],
        pay_period_start: periodStart || payDate,
        pay_period_end: periodEnd || payDate,
        pay_date: payDate,
        paycheck_number: paycheckNumber || undefined,
        gross_amount: grossOverride ? parseFloat(grossOverride) : undefined,
      }),
    });

    if (res.ok) {
      const pc = await res.json();
      router.push(`/dashboard/finance/paychecks/${pc.id}`);
    } else {
      const d = await res.json().catch(() => ({ error: 'Failed' }));
      setError(d.error ?? 'Failed to create paycheck');
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <Link href="/dashboard/finance/paychecks" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm transition min-h-11">
        <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Paychecks
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
        <Banknote className="w-6 h-6 text-amber-600" aria-hidden="true" />
        Create Paycheck
      </h1>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700" role="alert">{error}</div>}

      {/* Job selector */}
      <div>
        <label htmlFor="job-select" className="block text-sm font-medium text-slate-700 mb-1">Job</label>
        <select
          id="job-select"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className={inputClass}
        >
          <option value="">Select a job...</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              #{j.job_number} — {j.client_name}{j.event_name ? ` (${j.event_name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Invoice selection */}
      {loadingInvoices ? (
        <div className="flex justify-center py-8" role="status"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : invoices.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Select Invoices ({selectedIds.size} of {invoices.length})</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {invoices.map((inv) => (
              <label key={inv.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={selectedIds.has(inv.id)}
                  onChange={() => toggleInvoice(inv.id)}
                  className="rounded border-slate-300"
                />
                <span className="font-mono text-xs text-amber-600">{inv.invoice_number ?? inv.id.slice(0, 8)}</span>
                <span className="text-sm text-slate-900 flex-1">{new Date(inv.invoice_date + 'T00:00').toLocaleDateString()}</span>
                <span className="text-sm font-medium text-slate-900">${Number(inv.total).toFixed(2)}</span>
              </label>
            ))}
          </div>
        </div>
      ) : jobId ? (
        <p className="text-sm text-slate-400 text-center py-4">No available invoices for this job (all may already be linked to paychecks).</p>
      ) : null}

      {/* Pay details */}
      {selectedIds.size > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="pay-date" className="block text-sm font-medium text-slate-700 mb-1">Pay Date *</label>
              <input id="pay-date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="period-start" className="block text-sm font-medium text-slate-700 mb-1">Period Start</label>
              <input id="period-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="period-end" className="block text-sm font-medium text-slate-700 mb-1">Period End</label>
              <input id="period-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pc-number" className="block text-sm font-medium text-slate-700 mb-1">Paycheck Number</label>
              <input id="pc-number" type="text" value={paycheckNumber} onChange={(e) => setPaycheckNumber(e.target.value)} placeholder="Auto-generated" className={inputClass} />
            </div>
            <div>
              <label htmlFor="gross-override" className="block text-sm font-medium text-slate-700 mb-1">Actual Gross (optional override)</label>
              <input id="gross-override" type="number" step="0.01" value={grossOverride} onChange={(e) => setGrossOverride(e.target.value)} placeholder={expectedGross.toFixed(2)} className={inputClass} />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500">Expected Gross</p>
                <p className="text-lg font-bold text-slate-900">${expectedGross.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Actual Gross</p>
                <p className="text-lg font-bold text-slate-900">${actualGross.toFixed(2)}</p>
              </div>
              {variance !== 0 && (
                <div>
                  <p className="text-xs text-amber-600 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Variance
                  </p>
                  <p className={`text-lg font-bold ${variance > 0 ? 'text-lime-600' : 'text-red-600'}`}>
                    {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={saving || !payDate}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-500 transition disabled:opacity-50 min-h-11"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Banknote className="w-4 h-4" aria-hidden="true" />}
            Create Paycheck
          </button>
        </div>
      )}
    </div>
  );
}

export default function NewPaycheckPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>}>
      <CreatePaycheckForm />
    </Suspense>
  );
}
