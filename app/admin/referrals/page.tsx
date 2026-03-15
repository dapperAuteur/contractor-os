'use client';

// app/admin/referrals/page.tsx
// Admin referral tree: leaderboard of users who bring in the most members,
// with paid conversion tracking and the ability to grant extra invites.

import { useEffect, useState, useCallback } from 'react';
import { Users, ChevronDown, ChevronUp, Check, X, Loader2, Gift, DollarSign, UserCheck, UserPlus, TrendingUp } from 'lucide-react';

interface InviteRow {
  id: string;
  email: string;
  product: string;
  accepted_at: string | null;
  is_paid: boolean;
  paid_at: string | null;
  subscription_tier: string | null;
  invited_at: string;
  user_id: string | null;
  downstream: number;
}

interface Referrer {
  user_id: string;
  username: string | null;
  display_name: string | null;
  invite_limit: number;
  total_sent: number;
  total_accepted: number;
  total_paid: number;
  downstream_total: number;
  invites: InviteRow[];
}

interface Totals {
  total_referrers: number;
  total_sent: number;
  total_accepted: number;
  total_paid: number;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function conversionRate(accepted: number, paid: number) {
  if (accepted === 0) return '0%';
  return `${Math.round((paid / accepted) * 100)}%`;
}

export default function AdminReferralsPage() {
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Invite limit editing
  const [editLimit, setEditLimit] = useState<Record<string, string>>({});
  const [savingLimit, setSavingLimit] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<Record<string, string>>({});

  // Paid marking
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/referrals')
      .then((r) => r.json())
      .then((d) => {
        setReferrers(d.referrers ?? []);
        setTotals(d.totals ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveLimit(userId: string, currentLimit: number) {
    const val = parseInt(editLimit[userId] ?? String(currentLimit), 10);
    if (isNaN(val) || val < 0) {
      setLimitError((prev) => ({ ...prev, [userId]: 'Enter a valid number' }));
      return;
    }
    setSavingLimit(userId);
    setLimitError((prev) => ({ ...prev, [userId]: '' }));
    try {
      const res = await fetch(`/api/admin/referrals/${userId}/invite-limit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_limit: val }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setReferrers((prev) => prev.map((r) => r.user_id === userId ? { ...r, invite_limit: val } : r));
      setEditLimit((prev) => ({ ...prev, [userId]: '' }));
    } catch (e) {
      setLimitError((prev) => ({ ...prev, [userId]: e instanceof Error ? e.message : 'Failed' }));
    } finally {
      setSavingLimit(null);
    }
  }

  async function togglePaid(inviteId: string, currentPaid: boolean, referrerId: string) {
    setMarkingPaid(inviteId);
    try {
      const res = await fetch(`/api/admin/invites/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_paid: !currentPaid,
          paid_at: !currentPaid ? new Date().toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setReferrers((prev) => prev.map((r) => {
        if (r.user_id !== referrerId) return r;
        return {
          ...r,
          total_paid: r.total_paid + (!currentPaid ? 1 : -1),
          invites: r.invites.map((inv) => inv.id === inviteId
            ? { ...inv, is_paid: !currentPaid, paid_at: !currentPaid ? new Date().toISOString() : null }
            : inv
          ),
        };
      }));
    } finally {
      setMarkingPaid(null);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-white mb-1">Referral Tree</h1>
      <p className="text-slate-500 text-sm mb-8">
        Users ranked by members brought in. Grant extra invites and track paid conversions.
      </p>

      {/* Summary cards */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Referrers', value: totals.total_referrers, icon: Users, color: '#6366f1' },
            { label: 'Total Invites Sent', value: totals.total_sent, icon: UserPlus, color: '#f59e0b' },
            { label: 'Accepted', value: totals.total_accepted, icon: UserCheck, color: '#10b981' },
            { label: 'Converted to Paid', value: totals.total_paid, icon: DollarSign, color: '#3b82f6' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} aria-hidden="true" />
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-slate-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      ) : referrers.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No peer referrals yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {referrers.map((referrer, idx) => {
            const isOpen = expanded === referrer.user_id;
            const totalImpact = referrer.total_accepted + referrer.downstream_total;
            const limitVal = editLimit[referrer.user_id] ?? '';

            return (
              <div key={referrer.user_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Row header */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : referrer.user_id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-100/60 transition text-left"
                >
                  {/* Rank */}
                  <span className={`text-sm font-bold w-6 shrink-0 ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-700' : idx === 2 ? 'text-amber-700' : 'text-slate-400'}`}>
                    #{idx + 1}
                  </span>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">
                      {referrer.display_name ?? referrer.username ?? referrer.user_id.slice(0, 8)}
                      {referrer.username && <span className="text-slate-400 font-normal ml-1.5">@{referrer.username}</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-slate-500 text-xs">{referrer.total_sent} sent</span>
                      <span className="text-green-400 text-xs">{referrer.total_accepted} joined</span>
                      {referrer.downstream_total > 0 && (
                        <span className="text-indigo-400 text-xs flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />+{referrer.downstream_total} downstream
                        </span>
                      )}
                      {referrer.total_paid > 0 && (
                        <span className="text-blue-400 text-xs">{referrer.total_paid} paid · {conversionRate(referrer.total_accepted, referrer.total_paid)}</span>
                      )}
                    </div>
                  </div>

                  {/* Impact score */}
                  <div className="text-center shrink-0">
                    <p className="text-lg font-bold text-amber-400">{totalImpact}</p>
                    <p className="text-slate-400 text-xs">impact</p>
                  </div>

                  {/* Invite limit badge */}
                  <div className="text-center shrink-0">
                    <p className="text-sm font-semibold text-slate-700">{referrer.invite_limit}</p>
                    <p className="text-slate-400 text-xs">limit</p>
                  </div>

                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-200 px-5 py-5 space-y-5">
                    {/* Grant invites */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5" aria-hidden="true" />
                        Grant Extra Invites
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-slate-500 text-sm">Current limit:</span>
                          <span className="text-white font-semibold">{referrer.invite_limit}</span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={10000}
                          value={limitVal}
                          onChange={(e) => setEditLimit((prev) => ({ ...prev, [referrer.user_id]: e.target.value }))}
                          placeholder="New limit"
                          aria-label="New invite limit"
                          className="w-28 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => saveLimit(referrer.user_id, referrer.invite_limit)}
                          disabled={savingLimit === referrer.user_id || !limitVal}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 min-h-11"
                        >
                          {savingLimit === referrer.user_id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Check className="w-4 h-4" />}
                          Save
                        </button>
                        {limitError[referrer.user_id] && (
                          <p className="text-red-400 text-xs" role="alert">{limitError[referrer.user_id]}</p>
                        )}
                      </div>
                    </div>

                    {/* Invite list */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">
                        Invites Sent ({referrer.invites.length})
                      </p>
                      {referrer.invites.length === 0 ? (
                        <p className="text-slate-400 text-sm italic">No invites sent yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {referrer.invites.map((inv) => (
                            <div
                              key={inv.id}
                              className="flex items-center gap-3 bg-slate-100/60 rounded-lg px-3 py-2.5"
                            >
                              {/* Status dot */}
                              <span className={`w-2 h-2 rounded-full shrink-0 ${inv.accepted_at ? 'bg-green-500' : 'bg-gray-600'}`} />

                              <div className="flex-1 min-w-0">
                                <p className="text-slate-800 text-sm truncate">{inv.email}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-slate-400 text-xs capitalize">{inv.product}</span>
                                  {inv.accepted_at && (
                                    <span className="text-green-400 text-xs">joined {fmtDate(inv.accepted_at)}</span>
                                  )}
                                  {!inv.accepted_at && (
                                    <span className="text-slate-400 text-xs">invited {fmtDate(inv.invited_at)}</span>
                                  )}
                                  {inv.downstream > 0 && (
                                    <span className="text-indigo-400 text-xs">+{inv.downstream} they invited</span>
                                  )}
                                </div>
                              </div>

                              {/* Paid status */}
                              {inv.accepted_at && (
                                <div className="shrink-0 flex items-center gap-2">
                                  {inv.is_paid && (
                                    <span className="text-xs text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded-full">
                                      Paid{inv.subscription_tier ? ` · ${inv.subscription_tier}` : ''}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => togglePaid(inv.id, inv.is_paid, referrer.user_id)}
                                    disabled={markingPaid === inv.id}
                                    aria-label={inv.is_paid ? 'Mark as not paid' : 'Mark as paid'}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition min-h-8 ${
                                      inv.is_paid
                                        ? 'bg-gray-700 text-slate-500 hover:bg-red-900/40 hover:text-red-300'
                                        : 'bg-gray-700 text-slate-500 hover:bg-blue-900/40 hover:text-blue-300'
                                    }`}
                                  >
                                    {markingPaid === inv.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : inv.is_paid ? <X className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                    {inv.is_paid ? 'Unmark' : 'Mark Paid'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
