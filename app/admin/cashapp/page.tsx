'use client';

// app/admin/cashapp/page.tsx
// Admin CashApp payment review — verify or reject pending payments.

import { useEffect, useState, useCallback } from 'react';
import { DollarSign, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Payment {
  id: string;
  amount: number;
  cashapp_name: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  verified_at: string | null;
  profiles?: { username: string | null; email: string; display_name: string | null; subscription_status: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  verified: 'bg-lime-100 text-lime-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function AdminCashAppPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    const params = tab === 'pending' ? '?status=pending' : '';
    const res = await offlineFetch(`/api/admin/cashapp${params}`);
    if (res.ok) setPayments(await res.json());
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: string, action: 'verify' | 'reject') {
    const msg = action === 'verify'
      ? 'Verify this payment and upgrade the user to lifetime?'
      : 'Reject this payment?';
    if (!confirm(msg)) return;

    setProcessing(id);
    await offlineFetch('/api/admin/cashapp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    await load();
    setProcessing(null);
  }

  const pending = payments.filter((p) => p.status === 'pending');
  const processed = payments.filter((p) => p.status !== 'pending');

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-amber-600" aria-hidden="true" />
          CashApp Payments
        </h1>
        <p className="text-sm text-slate-500 mt-1">Review and verify CashApp lifetime payments</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-amber-600 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pending.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-lime-600 uppercase tracking-wider">Verified</p>
          <p className="text-2xl font-bold text-lime-600 mt-1">{payments.filter((p) => p.status === 'verified').length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-red-600 uppercase tracking-wider">Rejected</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{payments.filter((p) => p.status === 'rejected').length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" role="tablist">
        {(['pending', 'all'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium min-h-11 transition ${
              tab === t ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t === 'pending' ? `Pending (${pending.length})` : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12" role="status">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" aria-hidden="true" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <DollarSign className="w-10 h-10 mx-auto mb-3" aria-hidden="true" />
          <p>{tab === 'pending' ? 'No pending payments' : 'No CashApp payments yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(tab === 'pending' ? pending : payments).map((p) => {
            const profile = p.profiles;
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {profile?.display_name || profile?.username || profile?.email || 'Unknown'}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[p.status]}`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{profile?.email}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>CashApp: <strong className="text-slate-700">{p.cashapp_name}</strong></span>
                      <span>${p.amount}</span>
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                    {p.admin_notes && <p className="text-xs text-slate-500 mt-1 italic">{p.admin_notes}</p>}
                  </div>

                  {p.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleAction(p.id, 'verify')}
                        disabled={processing === p.id}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-lime-600 text-white rounded-xl text-sm font-medium hover:bg-lime-500 transition disabled:opacity-50 min-h-11"
                      >
                        {processing === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                        Verify
                      </button>
                      <button
                        onClick={() => handleAction(p.id, 'reject')}
                        disabled={processing === p.id}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition disabled:opacity-50 min-h-11"
                      >
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <strong>CashApp note:</strong> CashApp charges 2.75% per received payment. Manual verification required — no API/webhooks.
          Only use for lifetime (one-time) purchases.
        </div>
      </div>
    </div>
  );
}
