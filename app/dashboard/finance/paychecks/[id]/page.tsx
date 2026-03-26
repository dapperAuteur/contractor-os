'use client';

// app/dashboard/finance/paychecks/[id]/page.tsx
// Paycheck detail: summary, tax reconciliation, deposit splits, scan from image.

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Banknote, Loader2, AlertTriangle, CheckCircle2,
  DollarSign, Receipt, Building2, Plus, X, Check, Trash2, ScanLine, Upload, Globe,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface TaxLine { id?: string; tax_type: string; label: string; expected_amount: number | null; actual_amount: number; sort_order: number; notes?: string }
interface DepositLine { id?: string; account_id: string; amount: number; percentage: number | null; deposit_type: string; transaction_id: string | null; label: string; sort_order: number; financial_accounts?: { id: string; name: string; account_type: string } }
interface InvoiceLink { invoice_id: string; invoices?: { id: string; invoice_number: string | null; total: number; status: string; invoice_date: string } }
interface Account { id: string; name: string; account_type: string }
interface ScanResult { gross_pay: number | null; net_pay: number | null; pay_date: string | null; taxes: { tax_type: string; label: string; amount: number }[]; deductions: { label: string; amount: number }[]; deposits: { label: string; account_last_four: string | null; amount: number }[]; confidence_notes: string }

interface Paycheck {
  id: string; paycheck_number: string | null; pay_period_start: string; pay_period_end: string; pay_date: string;
  gross_amount: number; benefits_total: number; taxes_total: number; other_deductions_total: number; net_amount: number;
  other_deductions: { label: string; amount: number }[];
  expected_gross: number | null; variance_amount: number | null; variance_notes: string | null;
  status: string; is_reconciled: boolean;
  contractor_jobs?: { id: string; job_number: string; client_name: string; event_name: string | null; user_contacts?: { paycheck_portal_url: string | null; paycheck_portal_company_id: string | null } | null } | null;
  paycheck_invoices: InvoiceLink[]; paycheck_taxes: TaxLine[]; paycheck_deposits: DepositLine[];
}

const TAX_PRESETS = [
  { tax_type: 'federal', label: 'Federal Income Tax' },
  { tax_type: 'state', label: 'State Income Tax' },
  { tax_type: 'fica_ss', label: 'FICA Social Security' },
  { tax_type: 'fica_medicare', label: 'FICA Medicare' },
  { tax_type: 'local', label: 'Local/City Tax' },
  { tax_type: 'state_disability', label: 'State Disability' },
];

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
  reconciled: 'bg-lime-100 text-lime-700',
  disputed: 'bg-red-100 text-red-700',
};

function fmt(n: number) { return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';

export default function PaycheckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pc, setPc] = useState<Paycheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'summary' | 'taxes' | 'deposits'>('summary');
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Tax editing
  const [taxRows, setTaxRows] = useState<TaxLine[]>([]);
  const [taxSaving, setTaxSaving] = useState(false);

  // Deposit editing
  const [depRows, setDepRows] = useState<DepositLine[]>([]);
  const [depSaving, setDepSaving] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Scan
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const loadPaycheck = useCallback(async () => {
    const res = await offlineFetch(`/api/finance/paychecks/${id}`);
    if (res.ok) {
      const data = await res.json();
      setPc(data);
      setTaxRows(data.paycheck_taxes ?? []);
      setDepRows(data.paycheck_deposits ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadPaycheck(); }, [loadPaycheck]);

  useEffect(() => {
    offlineFetch('/api/finance/accounts')
      .then((r) => r.json())
      .then((d) => setAccounts((d.accounts ?? d ?? []).filter((a: Account & { is_active?: boolean }) => a.is_active !== false)))
      .catch(() => {});
  }, []);

  // ─── Tax Actions ──────────────────────────────────────────

  async function saveTaxes() {
    setTaxSaving(true);
    await offlineFetch(`/api/finance/paychecks/${id}/taxes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxes: taxRows }),
    });
    await loadPaycheck();
    setTaxSaving(false);
  }

  function addTaxRow(preset?: { tax_type: string; label: string }) {
    setTaxRows([...taxRows, {
      tax_type: preset?.tax_type ?? 'other',
      label: preset?.label ?? '',
      expected_amount: null,
      actual_amount: 0,
      sort_order: taxRows.length,
    }]);
  }

  // ─── Deposit Actions ──────────────────────────────────────

  async function saveDeposits() {
    setDepSaving(true);
    const res = await offlineFetch(`/api/finance/paychecks/${id}/deposits`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deposits: depRows }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({ error: 'Failed' }));
      alert(d.error);
    }
    await loadPaycheck();
    setDepSaving(false);
  }

  async function executeDeposits() {
    if (!confirm('Execute deposits and reconcile this paycheck? This will create transactions and mark invoices as paid.')) return;
    setExecuting(true);
    await offlineFetch(`/api/finance/paychecks/${id}/deposits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execute: true }),
    });
    await loadPaycheck();
    setExecuting(false);
  }

  function addDepositRow() {
    setDepRows([...depRows, { account_id: accounts[0]?.id ?? '', amount: 0, percentage: null, deposit_type: 'direct_deposit', transaction_id: null, label: '', sort_order: depRows.length }]);
  }

  const depositTotal = depRows.reduce((s, d) => s + Number(d.amount ?? 0), 0);
  const depositBalance = (pc?.net_amount ?? 0) - depositTotal;

  // ─── Scan Actions ─────────────────────────────────────────

  async function handleScan(file: File) {
    setScanning(true);
    setScanResult(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const res = await offlineFetch(`/api/finance/paychecks/${id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: dataUrl }),
      });
      if (res.ok) {
        const d = await res.json();
        setScanResult(d.scan);
      }
      setScanning(false);
    };
    reader.readAsDataURL(file);
  }

  function applyScanResult() {
    if (!scanResult || !pc) return;
    // Apply gross
    if (scanResult.gross_pay != null) {
      offlineFetch(`/api/finance/paychecks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gross_amount: scanResult.gross_pay }),
      });
    }
    // Apply taxes
    if (scanResult.taxes?.length) {
      setTaxRows(scanResult.taxes.map((t, i) => ({
        tax_type: t.tax_type,
        label: t.label,
        expected_amount: null,
        actual_amount: t.amount,
        sort_order: i,
      })));
      setTab('taxes');
    }
    setScanResult(null);
    setTimeout(() => loadPaycheck(), 500);
  }

  // ─── Delete ───────────────────────────────────────────────

  async function handleDelete() {
    if (!confirm('Delete this paycheck? Linked invoices will be unlinked and transactions removed.')) return;
    await offlineFetch(`/api/finance/paychecks/${id}`, { method: 'DELETE' });
    router.push('/dashboard/finance/paychecks');
  }

  if (loading || !pc) {
    return (
      <div className="flex justify-center py-20" role="status">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" aria-hidden="true" />
      </div>
    );
  }

  const TABS = [
    { id: 'summary', label: 'Summary', icon: Receipt },
    { id: 'taxes', label: 'Taxes', icon: DollarSign },
    { id: 'deposits', label: 'Deposits', icon: Building2 },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Back link */}
      <Link href="/dashboard/finance/paychecks" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm transition min-h-11">
        <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Paychecks
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Banknote className="w-6 h-6 text-amber-600" aria-hidden="true" />
            {pc.paycheck_number ?? 'Draft Paycheck'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {pc.contractor_jobs?.client_name ?? 'No job'}
            {pc.contractor_jobs?.job_number && ` · #${pc.contractor_jobs.job_number}`}
            {` · ${new Date(pc.pay_date + 'T00:00').toLocaleDateString()}`}
            {pc.contractor_jobs?.user_contacts?.paycheck_portal_url && (
              <>
                {' · '}
                <a
                  href={pc.contractor_jobs.user_contacts.paycheck_portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:text-amber-500 inline-flex items-center gap-1 transition"
                  aria-label="Open paycheck portal"
                >
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" /> Pay Portal
                  {pc.contractor_jobs.user_contacts.paycheck_portal_company_id && (
                    <span className="text-slate-400 ml-1">(ID: {pc.contractor_jobs.user_contacts.paycheck_portal_company_id})</span>
                  )}
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[pc.status] ?? STATUS_STYLES.draft}`}>
            {pc.status}
          </span>
          {!pc.is_reconciled && (
            <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition min-h-11" aria-label="Delete paycheck">
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Financial summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gross', value: pc.gross_amount, color: 'text-slate-900' },
          { label: 'Taxes', value: pc.taxes_total, color: 'text-red-600' },
          { label: 'Deductions', value: pc.other_deductions_total + pc.benefits_total, color: 'text-amber-600' },
          { label: 'Net', value: pc.net_amount, color: 'text-lime-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Variance alert */}
      {pc.variance_amount != null && pc.variance_amount !== 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          Variance: {fmt(pc.variance_amount)} ({pc.variance_amount > 0 ? 'over' : 'under'} expected)
        </div>
      )}

      {/* Scan from image */}
      {!pc.is_reconciled && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-amber-600" aria-hidden="true" />
                Scan Paycheck Image
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Upload a photo of your pay stub to auto-fill taxes and amounts</p>
            </div>
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition cursor-pointer min-h-11">
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />}
              {scanning ? 'Scanning...' : 'Upload Image'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScan(f); }}
                disabled={scanning}
              />
            </label>
          </div>

          {/* Scan result review */}
          {scanResult && (
            <div className="mt-4 border-t border-slate-200 pt-4 space-y-3">
              <p className="text-sm font-medium text-slate-900">Scan Results — Review & Apply</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {scanResult.gross_pay != null && <div><span className="text-slate-500">Gross:</span> <span className="font-medium text-slate-900">{fmt(scanResult.gross_pay)}</span></div>}
                {scanResult.net_pay != null && <div><span className="text-slate-500">Net:</span> <span className="font-medium text-slate-900">{fmt(scanResult.net_pay)}</span></div>}
              </div>
              {scanResult.taxes?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">Taxes Detected:</p>
                  {scanResult.taxes.map((t, i) => (
                    <div key={i} className="flex justify-between text-xs text-slate-700 py-0.5">
                      <span>{t.label}</span><span>{fmt(t.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {scanResult.confidence_notes && (
                <p className="text-xs text-amber-600">{scanResult.confidence_notes}</p>
              )}
              <div className="flex gap-2">
                <button onClick={applyScanResult} className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-500 transition min-h-11">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> Apply to Paycheck
                </button>
                <button onClick={() => setScanResult(null)} className="text-sm text-slate-500 hover:text-slate-700 min-h-11 px-3">Dismiss</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition min-h-11 -mb-px ${
                active ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── Summary Tab ──────────────────────────────────────── */}
      {tab === 'summary' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Linked Invoices ({pc.paycheck_invoices.length})</h3>
            {pc.paycheck_invoices.length === 0 ? (
              <p className="text-sm text-slate-400">No invoices linked.</p>
            ) : (
              <div className="space-y-1.5">
                {pc.paycheck_invoices.map((link) => {
                  const inv = link.invoices;
                  return inv ? (
                    <Link key={link.invoice_id} href={`/dashboard/finance/invoices/${inv.id}`} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 transition">
                      <span className="font-mono text-xs text-amber-600">{inv.invoice_number ?? inv.id.slice(0, 8)}</span>
                      <span className="text-slate-700">{new Date(inv.invoice_date + 'T00:00').toLocaleDateString()}</span>
                      <span className="font-medium text-slate-900">{fmt(inv.total)}</span>
                      <span className={`text-xs ${inv.status === 'paid' ? 'text-lime-600' : 'text-slate-400'}`}>{inv.status}</span>
                    </Link>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {pc.is_reconciled && (
            <div className="flex items-center gap-2 bg-lime-50 border border-lime-200 rounded-xl p-3 text-sm text-lime-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              Reconciled — all invoices paid, deposits executed.
            </div>
          )}
        </div>
      )}

      {/* ─── Taxes Tab ────────────────────────────────────────── */}
      {tab === 'taxes' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            {taxRows.map((tax, i) => (
              <div key={tax.id ?? i} className="flex items-center gap-2">
                <select
                  value={tax.tax_type}
                  onChange={(e) => { const u = [...taxRows]; u[i] = { ...tax, tax_type: e.target.value }; setTaxRows(u); }}
                  className="w-36 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  aria-label="Tax type"
                >
                  {['federal','state','local','fica_ss','fica_medicare','state_disability','state_unemployment','local_other','other'].map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <input type="text" value={tax.label} onChange={(e) => { const u = [...taxRows]; u[i] = { ...tax, label: e.target.value }; setTaxRows(u); }} placeholder="Label" className={`flex-1 ${inputClass}`} aria-label="Tax label" />
                <input type="number" step="0.01" value={tax.actual_amount} onChange={(e) => { const u = [...taxRows]; u[i] = { ...tax, actual_amount: parseFloat(e.target.value) || 0 }; setTaxRows(u); }} className={`w-28 text-right ${inputClass}`} aria-label="Actual amount" />
                <button onClick={() => setTaxRows(taxRows.filter((_, j) => j !== i))} className="min-h-11 min-w-11 flex items-center justify-center text-slate-400 hover:text-red-500 transition" aria-label="Remove tax line">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}

            {/* Add presets */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {TAX_PRESETS.filter((p) => !taxRows.some((r) => r.tax_type === p.tax_type)).map((p) => (
                <button key={p.tax_type} onClick={() => addTaxRow(p)} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition min-h-11">
                  + {p.label}
                </button>
              ))}
              <button onClick={() => addTaxRow()} className="text-xs text-amber-600 px-2.5 py-1.5 hover:bg-amber-50 rounded-lg transition min-h-11">
                <Plus className="w-3 h-3 inline" aria-hidden="true" /> Custom
              </button>
            </div>

            {/* Totals */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-sm font-semibold">
              <span className="text-slate-700">Total Taxes</span>
              <span className="text-red-600">{fmt(taxRows.reduce((s, t) => s + Number(t.actual_amount ?? 0), 0))}</span>
            </div>

            <button onClick={saveTaxes} disabled={taxSaving} className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-500 transition disabled:opacity-50 min-h-11">
              {taxSaving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
              Save Taxes
            </button>
          </div>
        </div>
      )}

      {/* ─── Deposits Tab ─────────────────────────────────────── */}
      {tab === 'deposits' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            {depRows.map((dep, i) => (
              <div key={dep.id ?? i} className="flex items-center gap-2">
                <select
                  value={dep.account_id}
                  onChange={(e) => { const u = [...depRows]; u[i] = { ...dep, account_id: e.target.value }; setDepRows(u); }}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  aria-label="Account"
                >
                  <option value="">Select account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.account_type})</option>
                  ))}
                </select>
                <input type="number" step="0.01" value={dep.amount} onChange={(e) => { const u = [...depRows]; u[i] = { ...dep, amount: parseFloat(e.target.value) || 0 }; setDepRows(u); }} placeholder="0.00" className={`w-28 text-right ${inputClass}`} aria-label="Deposit amount" />
                <input type="text" value={dep.label} onChange={(e) => { const u = [...depRows]; u[i] = { ...dep, label: e.target.value }; setDepRows(u); }} placeholder="Label" className={`w-32 ${inputClass}`} aria-label="Deposit label" />
                {!dep.transaction_id && (
                  <button onClick={() => setDepRows(depRows.filter((_, j) => j !== i))} className="min-h-11 min-w-11 flex items-center justify-center text-slate-400 hover:text-red-500 transition" aria-label="Remove deposit">
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
                {dep.transaction_id && (
                  <Link href={`/dashboard/finance/transactions?id=${dep.transaction_id}`} className="text-xs text-lime-600 hover:underline min-h-11 flex items-center px-2">Linked</Link>
                )}
              </div>
            ))}

            <button onClick={addDepositRow} className="text-xs text-amber-600 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition min-h-11">
              <Plus className="w-3 h-3 inline" aria-hidden="true" /> Add Split
            </button>

            {/* Balance indicator */}
            <div className={`flex justify-between items-center pt-3 border-t border-slate-200 text-sm font-semibold ${
              Math.abs(depositBalance) < 0.01 ? 'text-lime-600' : 'text-red-600'
            }`}>
              <span className="text-slate-700">Remaining to allocate</span>
              <span>{fmt(depositBalance)}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={saveDeposits} disabled={depSaving} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition disabled:opacity-50 min-h-11">
                {depSaving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
                Save Splits
              </button>
              {!pc.is_reconciled && depRows.length > 0 && Math.abs(depositBalance) < 0.01 && (
                <button onClick={executeDeposits} disabled={executing} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-500 transition disabled:opacity-50 min-h-11">
                  {executing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Banknote className="w-4 h-4" aria-hidden="true" />}
                  Execute & Reconcile
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
