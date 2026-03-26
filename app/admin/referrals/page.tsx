'use client';

// app/admin/referrals/page.tsx
// Admin referral tree: leaderboard with reward tier progress,
// paid conversion tracking, and invite limit management.

import { useEffect, useState, useCallback } from 'react';
import {
  Users, ChevronDown, ChevronUp, Check, X, Loader2, Gift, DollarSign,
  UserCheck, UserPlus, TrendingUp, Award, Trophy,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

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

interface RewardTier {
  id: string;
  name: string;
  paid_referrals: number;
  reward_type: string;
  reward_months: number;
}

interface IssuedReward {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  paid_count: number;
  applied_at: string;
  referral_reward_tiers: { name: string; paid_referrals: number; reward_type: string; reward_months: number } | null;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function conversionRate(accepted: number, paid: number) {
  if (accepted === 0) return '0%';
  return `${Math.round((paid / accepted) * 100)}%`;
}

const TIER_COLORS: Record<string, string> = {
  Bronze: 'text-amber-700 bg-amber-100',
  Silver: 'text-slate-600 bg-slate-200',
  Gold: 'text-amber-600 bg-amber-50 border border-amber-300',
};

export default function AdminReferralsPage() {
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [tiers, setTiers] = useState<RewardTier[]>([]);
  const [rewards, setRewards] = useState<IssuedReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [checkingReward, setCheckingReward] = useState<string | null>(null);
  const [rewardResult, setRewardResult] = useState<{ userId: string; applied: string[] } | null>(null);

  // Invite limit editing
  const [editLimit, setEditLimit] = useState<Record<string, string>>({});
  const [savingLimit, setSavingLimit] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<Record<string, string>>({});

  // Paid marking
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [refRes, rewardRes] = await Promise.all([
      offlineFetch('/api/admin/referrals'),
      offlineFetch('/api/admin/referrals/rewards'),
    ]);
    if (refRes.ok) {
      const d = await refRes.json();
      setReferrers(d.referrers ?? []);
      setTotals(d.totals ?? null);
    }
    if (rewardRes.ok) {
      const d = await rewardRes.json();
      setTiers(d.tiers ?? []);
      setRewards(d.rewards ?? []);
    }
    setLoading(false);
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
      const res = await offlineFetch(`/api/admin/referrals/${userId}/invite-limit`, {
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
      const res = await offlineFetch(`/api/admin/invites/${inviteId}`, {
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

      // Auto-check rewards after marking paid
      if (!currentPaid) {
        await checkRewards(referrerId);
      }
    } finally {
      setMarkingPaid(null);
    }
  }

  async function checkRewards(userId: string) {
    setCheckingReward(userId);
    setRewardResult(null);
    const res = await offlineFetch('/api/admin/referrals/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.newly_applied?.length > 0) {
        setRewardResult({ userId, applied: data.newly_applied });
        await load(); // Refresh rewards list
      }
    }
    setCheckingReward(null);
  }

  // Get current tier for a referrer
  function getCurrentTier(paidCount: number): { current: RewardTier | null; next: RewardTier | null; progress: number } {
    let current: RewardTier | null = null;
    let next: RewardTier | null = null;

    for (const tier of tiers) {
      if (paidCount >= tier.paid_referrals) {
        current = tier;
      } else if (!next) {
        next = tier;
      }
    }

    const prevThreshold = current?.paid_referrals ?? 0;
    const nextThreshold = next?.paid_referrals ?? prevThreshold;
    const progress = nextThreshold > prevThreshold
      ? Math.min(100, Math.round(((paidCount - prevThreshold) / (nextThreshold - prevThreshold)) * 100))
      : 100;

    return { current, next, progress };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-label="Loading referrals">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Users className="w-6 h-6 text-amber-600" aria-hidden="true" />
          Referral Tree
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Users ranked by members brought in. Track conversions and reward top referrers.
        </p>
      </div>

      {/* Summary cards */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Referrers', value: totals.total_referrers, icon: Users, color: 'text-indigo-600' },
            { label: 'Invites Sent', value: totals.total_sent, icon: UserPlus, color: 'text-amber-600' },
            { label: 'Accepted', value: totals.total_accepted, icon: UserCheck, color: 'text-lime-600' },
            { label: 'Converted to Paid', value: totals.total_paid, icon: DollarSign, color: 'text-blue-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} aria-hidden="true" />
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-slate-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reward Tiers */}
      {tiers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-600" aria-hidden="true" />
            Reward Tiers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tiers.map((tier) => (
              <div key={tier.id} className={`rounded-xl p-4 text-center ${TIER_COLORS[tier.name] || 'bg-slate-100 text-slate-700'}`}>
                <p className="text-lg font-bold">{tier.name}</p>
                <p className="text-sm mt-1">{tier.paid_referrals} paid referrals</p>
                <p className="text-xs mt-1 opacity-75">
                  {tier.reward_type === 'upgrade'
                    ? 'Lifetime upgrade'
                    : `${tier.reward_months} month${tier.reward_months > 1 ? 's' : ''} free`
                  }
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Rewards Issued */}
      {rewards.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-amber-600" aria-hidden="true" />
            Recent Rewards Issued
          </h2>
          <div className="space-y-2">
            {rewards.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5 text-sm">
                <Award className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
                <span className="text-slate-900 font-medium">
                  {r.display_name || r.username || r.user_id.slice(0, 8)}
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TIER_COLORS[r.referral_reward_tiers?.name ?? ''] || 'bg-slate-100'}`}>
                  {r.referral_reward_tiers?.name}
                </span>
                <span className="text-slate-500 text-xs ml-auto">{fmtDate(r.applied_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reward result banner */}
      {rewardResult && (
        <div className="flex items-center gap-2 bg-lime-50 border border-lime-200 rounded-xl p-4" role="alert">
          <Trophy className="w-5 h-5 text-lime-600 shrink-0" aria-hidden="true" />
          <p className="text-sm text-lime-700">
            Reward unlocked: {rewardResult.applied.join(', ')}
          </p>
        </div>
      )}

      {/* Referrer list */}
      {referrers.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3" aria-hidden="true" />
          <p className="text-lg font-medium">No peer referrals yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {referrers.map((referrer, idx) => {
            const isOpen = expanded === referrer.user_id;
            const totalImpact = referrer.total_accepted + referrer.downstream_total;
            const limitVal = editLimit[referrer.user_id] ?? '';
            const { current, next, progress } = getCurrentTier(referrer.total_paid);

            return (
              <div key={referrer.user_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Row header */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : referrer.user_id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-slate-50 transition text-left min-h-11"
                >
                  {/* Rank */}
                  <span className={`text-sm font-bold w-6 shrink-0 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-500' : idx === 2 ? 'text-amber-700' : 'text-slate-400'}`}>
                    #{idx + 1}
                  </span>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 font-medium text-sm truncate">
                      {referrer.display_name ?? referrer.username ?? referrer.user_id.slice(0, 8)}
                      {referrer.username && <span className="text-slate-400 font-normal ml-1.5">@{referrer.username}</span>}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5">
                      <span className="text-slate-500 text-xs">{referrer.total_sent} sent</span>
                      <span className="text-lime-600 text-xs">{referrer.total_accepted} joined</span>
                      {referrer.downstream_total > 0 && (
                        <span className="text-indigo-500 text-xs flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" aria-hidden="true" />+{referrer.downstream_total} downstream
                        </span>
                      )}
                      {referrer.total_paid > 0 && (
                        <span className="text-blue-600 text-xs">{referrer.total_paid} paid · {conversionRate(referrer.total_accepted, referrer.total_paid)}</span>
                      )}
                      {current && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TIER_COLORS[current.name] || 'bg-slate-100'}`}>
                          {current.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Impact score */}
                  <div className="text-center shrink-0 hidden sm:block">
                    <p className="text-lg font-bold text-amber-600">{totalImpact}</p>
                    <p className="text-slate-400 text-xs">impact</p>
                  </div>

                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-200 px-4 sm:px-5 py-5 space-y-5">
                    {/* Reward tier progress */}
                    {next && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                          Next Reward: {next.name}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 shrink-0">
                            {referrer.total_paid}/{next.paid_referrals} paid
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {next.reward_type === 'upgrade'
                            ? 'Earns lifetime upgrade'
                            : `Earns ${next.reward_months} month${next.reward_months > 1 ? 's' : ''} free`
                          }
                        </p>
                      </div>
                    )}

                    {/* Check rewards button */}
                    <button
                      onClick={() => checkRewards(referrer.user_id)}
                      disabled={checkingReward === referrer.user_id}
                      className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-medium hover:bg-amber-100 transition disabled:opacity-50 min-h-11"
                    >
                      {checkingReward === referrer.user_id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        : <Award className="w-3.5 h-3.5" aria-hidden="true" />
                      }
                      Check & Apply Rewards
                    </button>

                    {/* Grant invites */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5" aria-hidden="true" />
                        Grant Extra Invites
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-slate-500 text-sm">Current:</span>
                          <span className="text-slate-900 font-semibold">{referrer.invite_limit}</span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={10000}
                          value={limitVal}
                          onChange={(e) => setEditLimit((prev) => ({ ...prev, [referrer.user_id]: e.target.value }))}
                          placeholder="New limit"
                          aria-label="New invite limit"
                          className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                        <button
                          type="button"
                          onClick={() => saveLimit(referrer.user_id, referrer.invite_limit)}
                          disabled={savingLimit === referrer.user_id || !limitVal}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 min-h-11"
                        >
                          {savingLimit === referrer.user_id
                            ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            : <Check className="w-4 h-4" aria-hidden="true" />}
                          Save
                        </button>
                        {limitError[referrer.user_id] && (
                          <p className="text-red-600 text-xs" role="alert">{limitError[referrer.user_id]}</p>
                        )}
                      </div>
                    </div>

                    {/* Invite list */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">
                        Invites Sent ({referrer.invites.length})
                      </p>
                      {referrer.invites.length === 0 ? (
                        <p className="text-slate-400 text-sm">No invites sent yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {referrer.invites.map((inv) => (
                            <div
                              key={inv.id}
                              className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5"
                            >
                              <span className={`w-2 h-2 rounded-full shrink-0 ${inv.accepted_at ? 'bg-lime-500' : 'bg-slate-300'}`} aria-hidden="true" />

                              <div className="flex-1 min-w-0">
                                <p className="text-slate-800 text-sm truncate">{inv.email}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  <span className="text-slate-400 text-xs capitalize">{inv.product}</span>
                                  {inv.accepted_at && (
                                    <span className="text-lime-600 text-xs">joined {fmtDate(inv.accepted_at)}</span>
                                  )}
                                  {!inv.accepted_at && (
                                    <span className="text-slate-400 text-xs">invited {fmtDate(inv.invited_at)}</span>
                                  )}
                                  {inv.downstream > 0 && (
                                    <span className="text-indigo-500 text-xs">+{inv.downstream} they invited</span>
                                  )}
                                </div>
                              </div>

                              {inv.accepted_at && (
                                <div className="shrink-0 flex items-center gap-2">
                                  {inv.is_paid && (
                                    <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                      Paid{inv.subscription_tier ? ` · ${inv.subscription_tier}` : ''}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => togglePaid(inv.id, inv.is_paid, referrer.user_id)}
                                    disabled={markingPaid === inv.id}
                                    aria-label={inv.is_paid ? 'Mark as not paid' : 'Mark as paid'}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition min-h-11 ${
                                      inv.is_paid
                                        ? 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600'
                                        : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                                  >
                                    {markingPaid === inv.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                                      : inv.is_paid ? <X className="w-3 h-3" aria-hidden="true" /> : <DollarSign className="w-3 h-3" aria-hidden="true" />}
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
