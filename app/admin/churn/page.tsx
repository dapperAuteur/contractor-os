'use client';

// app/admin/churn/page.tsx
// Churn prevention dashboard — identify at-risk paid users and take action.

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Loader2, Clock, Mail, ShieldAlert, UserX, Activity } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface AtRiskUser {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  subscription_status: string;
  subscription_expires_at: string | null;
  last_active: string | null;
  days_inactive: number;
  top_modules: string[];
}

interface Summary {
  total: number;
  at_risk: number;
  critical: number;
}

export default function ChurnPage() {
  const [users, setUsers] = useState<AtRiskUser[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, at_risk: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const res = await offlineFetch('/api/admin/churn');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
      setSummary(data.summary ?? { total: 0, at_risk: 0, critical: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendWinBack = async (userId: string, email: string) => {
    setSendingEmail(userId);
    // Create and send a one-off win-back campaign targeting this user
    const res = await offlineFetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Win-back: ${email}`,
        subject: "We miss you — here's what's new",
        template_key: 'win-back',
        body_html: '', // Will use template
        audience_filter: {},
      }),
    });

    if (res.ok) {
      setEmailSent((prev) => new Set([...prev, userId]));
    }
    setSendingEmail(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-label="Loading churn data">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" aria-hidden="true" />
      </div>
    );
  }

  const riskLevel = (days: number) => {
    if (days >= 60) return { label: 'Critical', color: 'text-red-600 bg-red-50', icon: ShieldAlert };
    if (days >= 30) return { label: 'High', color: 'text-amber-700 bg-amber-50', icon: AlertTriangle };
    return { label: 'At Risk', color: 'text-yellow-700 bg-yellow-50', icon: Clock };
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <UserX className="w-6 h-6 text-amber-600" aria-hidden="true" />
          Churn Prevention
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Paid users who haven&apos;t been active in 14+ days
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Paid Users</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total}</p>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-5">
          <p className="text-xs text-amber-600 uppercase tracking-wider">At Risk (14–29d)</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{summary.at_risk}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-xl p-5">
          <p className="text-xs text-red-600 uppercase tracking-wider">Critical (30d+)</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary.critical}</p>
        </div>
      </div>

      {/* User list */}
      {users.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Activity className="w-10 h-10 mx-auto mb-3" aria-hidden="true" />
          <p className="text-lg font-medium">All paid users are active</p>
          <p className="text-sm mt-1">No at-risk users detected — great retention!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const risk = riskLevel(u.days_inactive);
            const RiskIcon = risk.icon;
            const alreadySent = emailSent.has(u.id);

            return (
              <div key={u.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {u.display_name || u.username || u.email}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${risk.color}`}>
                        <RiskIcon className="w-3 h-3" aria-hidden="true" />
                        {risk.label}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                        {u.subscription_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>

                  {/* Activity details */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 shrink-0">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {u.days_inactive}d inactive
                    </span>
                    {u.last_active && (
                      <span>Last: {new Date(u.last_active).toLocaleDateString()}</span>
                    )}
                    {u.subscription_expires_at && (
                      <span>Renews: {new Date(u.subscription_expires_at).toLocaleDateString()}</span>
                    )}
                  </div>

                  {/* Win-back action */}
                  <button
                    onClick={() => sendWinBack(u.id, u.email)}
                    disabled={sendingEmail === u.id || alreadySent}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-medium hover:bg-amber-500 transition disabled:opacity-50 min-h-11 shrink-0"
                    aria-label={alreadySent ? `Win-back email sent to ${u.email}` : `Send win-back email to ${u.email}`}
                  >
                    {sendingEmail === u.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {alreadySent ? 'Sent' : 'Win-back'}
                  </button>
                </div>

                {/* Top modules */}
                {u.top_modules.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-xs text-slate-400">Used:</span>
                    {u.top_modules.map((mod) => (
                      <span key={mod} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                        {mod}
                      </span>
                    ))}
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
