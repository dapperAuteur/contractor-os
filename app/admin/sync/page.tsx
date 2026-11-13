'use client';

// app/admin/sync/page.tsx
// Admin page for manually triggering knowledge sync, demo reset, and viewing sync status.

import { useState, useEffect } from 'react';
import { RefreshCw, Database, BookOpen, Users, CheckCircle, XCircle, Loader2, Clock, FileText } from 'lucide-react';
import { HelpSyncCard } from '@/components/admin/HelpSyncCard';

interface SyncStatus {
  lastSynced: string | null;
}

interface ActionResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// The route's answers when the admin session is refused (lib/auth/admin-verdict.ts codes).
function demoResetDenial(code: unknown, error: unknown): string {
  switch (code) {
    case 'signed_out':
      return 'You are signed out. Sign in again, then retry.';
    case 'not_admin':
      return 'This account is not the admin account, so it cannot reset the demo data.';
    case 'mfa_required':
      return typeof error === 'string' && error
        ? error
        : 'Admin actions need two-factor sign-in. Sign out, then sign in again with your authenticator code.';
    default:
      return typeof error === 'string' && error ? error : 'Reset failed';
  }
}

function ActionCard({
  title,
  description,
  icon: Icon,
  buttonLabel,
  onAction,
  result,
  loading,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  buttonLabel: string;
  onAction: () => void;
  result: ActionResult | null;
  loading: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-amber-900/30 text-amber-400 shrink-0">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
          <p className="text-sm text-slate-500 mb-4">{description}</p>

          <button
            onClick={onAction}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition min-h-11"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            )}
            {loading ? 'Running...' : buttonLabel}
          </button>

          {result && (
            <div className={`mt-3 flex items-start gap-2 text-sm ${result.ok ? 'text-green-700' : 'text-red-700'}`}>
              {result.ok ? (
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              )}
              <div>
                <p>{result.message}</p>
                {result.details && (
                  <pre className="mt-1 text-xs text-slate-400 whitespace-pre-wrap">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminSyncPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // The embedding cards share one Mistral per-minute budget, so only one runs at a time.
  const [helpSyncRunning, setHelpSyncRunning] = useState(false);

  const [demoResult, setDemoResult] = useState<ActionResult | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);


  useEffect(() => {
    fetch('/api/admin/knowledge/status')
      .then((r) => r.json())
      .then((d) => {
        setStatus({ lastSynced: d.value ?? d.lastSynced ?? null });
        setStatusLoading(false);
      })
      .catch(() => setStatusLoading(false));
  }, []);

  async function runDemoReset() {
    setDemoLoading(true);
    setDemoResult(null);
    try {
      const res = await fetch('/api/admin/demo/reset', {
        method: 'POST',
        // The admin's own signed-in session (cookies) authorises this. No secret in the browser.
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDemoResult({
          ok: true,
          message: `Reset demo accounts: ${(data.reset ?? []).join(', ')}`,
          details: data,
        });
      } else {
        setDemoResult({ ok: false, message: demoResetDenial(data.code, data.error) });
      }
    } catch (err) {
      setDemoResult({ ok: false, message: err instanceof Error ? err.message : 'Network error' });
    }
    setDemoLoading(false);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Sync & Data</h1>
      <p className="text-slate-500 text-sm mb-6">Manually trigger knowledge sync, demo reset, and data operations. These also run automatically via daily cron jobs.</p>

      {/* Last sync status */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex items-center gap-3">
        <Clock className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm text-slate-500">Last knowledge sync</p>
          {statusLoading ? (
            <p className="text-slate-900 text-sm">Loading...</p>
          ) : status?.lastSynced ? (
            <p className="text-slate-900 text-sm font-medium">{formatDate(status.lastSynced)}</p>
          ) : (
            <p className="text-amber-600 text-sm font-medium">Never synced — run a sync now</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <HelpSyncCard
          title="Knowledge Sync"
          description="Embeds the help articles that changed since the last sync, or that have no Mistral embedding yet (unchanged ones are skipped), and updates the knowledge timestamp. Sends articles to Mistral in batches, so a full run takes well under a minute. Runs daily at 3:00 AM UTC via cron."
          icon={BookOpen}
          buttonLabel="Run Knowledge Sync"
          endpoint="/api/admin/knowledge/refresh"
          disabled={helpSyncRunning}
          onRunningChange={setHelpSyncRunning}
          onDone={(o) => {
            if (o.timestamp) setStatus({ lastSynced: o.timestamp });
          }}
        />

        <HelpSyncCard
          title="Help Article Ingest"
          description="Re-embeds every help article from lib/help/articles.ts with Mistral, changed or not. Use it after changing the embedding model; for content edits, Knowledge Sync is enough."
          icon={Database}
          buttonLabel="Re-ingest Help Articles"
          endpoint="/api/admin/help/ingest"
          body={{ force: true }}
          disabled={helpSyncRunning}
          onRunningChange={setHelpSyncRunning}
        />

        <HelpSyncCard
          title="Union Document Embeddings"
          description="Re-embeds the union document sections that have no Mistral embedding yet (uploaded before the move from Gemini), from the text already stored. New uploads are embedded on upload. Union chat cannot find a section until it is embedded."
          icon={FileText}
          buttonLabel="Re-embed Union Documents"
          endpoint="/api/admin/union/reembed"
          unit="section"
          disabled={helpSyncRunning}
          onRunningChange={setHelpSyncRunning}
        />

        <ActionCard
          title="Demo Account Reset"
          description="Clears and re-seeds all demo accounts (tutorial, visitor, contractor, lister) with fresh data. Runs daily at midnight UTC via cron. The button uses your signed-in admin session (two-factor required)."
          icon={Users}
          buttonLabel="Reset Demo Accounts"
          onAction={runDemoReset}
          result={demoResult}
          loading={demoLoading}
        />
      </div>

      <div className="mt-8 bg-white/50 border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Cron Schedule</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Demo Reset</span>
            <code className="text-slate-400">0 0 * * *</code>
            <span className="text-slate-400">Daily at midnight UTC</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Knowledge Sync</span>
            <code className="text-slate-400">0 3 * * *</code>
            <span className="text-slate-400">Daily at 3:00 AM UTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
