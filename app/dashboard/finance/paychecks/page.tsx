'use client';

// app/dashboard/finance/paychecks/page.tsx
// Paychecks list with status filters.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Banknote, Plus, Loader2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Paycheck {
  id: string;
  paycheck_number: string | null;
  pay_date: string;
  gross_amount: number;
  taxes_total: number;
  net_amount: number;
  status: string;
  variance_amount: number | null;
  contractor_jobs: { job_number: string; client_name: string } | null;
  paycheck_invoices: { invoice_id: string }[];
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  reconciled: { bg: 'bg-lime-100', text: 'text-lime-700' },
  disputed: { bg: 'bg-red-100', text: 'text-red-700' },
};

function fmt(n: number) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaychecksListPage() {
  const [paychecks, setPaychecks] = useState<Paycheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (statusFilter !== 'all') params.set('status', statusFilter);

    offlineFetch(`/api/finance/paychecks?${params}`)
      .then((r) => r.json())
      .then((d) => setPaychecks(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Banknote className="w-6 h-6 text-amber-600" aria-hidden="true" />
          Paychecks
        </h1>
        <Link
          href="/dashboard/finance/paychecks/new"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 min-h-11"
        >
          <Plus size={16} aria-hidden="true" /> New Paycheck
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {['all', 'draft', 'pending', 'reconciled', 'disputed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            aria-pressed={statusFilter === s}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium min-h-11 transition ${
              statusFilter === s
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12" role="status" aria-label="Loading">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" aria-hidden="true" />
        </div>
      ) : paychecks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
          <Banknote className="w-10 h-10 mx-auto mb-3" aria-hidden="true" />
          <p>No paychecks yet.</p>
          <Link href="/dashboard/finance/paychecks/new" className="text-amber-600 hover:underline text-sm mt-1 inline-block">Create your first</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {paychecks.map((pc) => {
            const style = STATUS_STYLES[pc.status] ?? STATUS_STYLES.draft;
            const invoiceCount = pc.paycheck_invoices?.length ?? 0;
            return (
              <Link
                key={pc.id}
                href={`/dashboard/finance/paychecks/${pc.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-amber-600">{pc.paycheck_number ?? 'Draft'}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
                      {pc.status}
                    </span>
                    {pc.variance_amount != null && pc.variance_amount !== 0 && (
                      <span className="text-xs text-amber-600 flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        {fmt(pc.variance_amount)} variance
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-900 font-medium">
                    {pc.contractor_jobs?.client_name ?? 'No job linked'}
                    {pc.contractor_jobs?.job_number && <span className="text-slate-400 ml-1.5">#{pc.contractor_jobs.job_number}</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(pc.pay_date + 'T00:00').toLocaleDateString()} · {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''} · Gross {fmt(pc.gross_amount)} · Net {fmt(pc.net_amount)}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-lg font-bold text-slate-900">{fmt(pc.net_amount)}</p>
                  <p className="text-xs text-slate-400">net</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
