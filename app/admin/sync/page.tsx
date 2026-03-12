'use client';

// app/admin/sync/page.tsx
// Admin page for manually triggering knowledge sync, demo reset, and viewing sync status.

import { useState, useEffect } from 'react';
import { RefreshCw, Database, BookOpen, Users, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

interface SyncStatus {
  lastSynced: string | null;
}

interface ActionResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-amber-900/30 text-amber-400 shrink-0">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-400 mb-4">{description}</p>

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
            <div className={`mt-3 flex items-start gap-2 text-sm ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
              {result.ok ? (
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              )}
              <div>
                <p>{result.message}</p>
                {result.details && (
                  <pre className="mt-1 text-xs text-gray-500 whitespace-pre-wrap">
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

  const [knowledgeResult, setKnowledgeResult] = useState<ActionResult | null>(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);

  const [demoResult, setDemoResult] = useState<ActionResult | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const [helpResult, setHelpResult] = useState<ActionResult | null>(null);
  const [helpLoading, setHelpLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/knowledge/status')
      .then((r) => r.json())
      .then((d) => {
        setStatus({ lastSynced: d.value ?? d.lastSynced ?? null });
        setStatusLoading(false);
      })
      .catch(() => setStatusLoading(false));
  }, []);

  async function runKnowledgeSync() {
    setKnowledgeLoading(true);
    setKnowledgeResult(null);
    try {
      const res = await fetch('/api/admin/knowledge/refresh', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setKnowledgeResult({
          ok: true,
          message: `Synced ${data.helpArticles?.succeeded ?? 0} help articles, ${data.courses?.processed ?? 0} course lessons.`,
          details: data,
        });
        setStatus({ lastSynced: data.timestamp ?? new Date().toISOString() });
      } else {
        setKnowledgeResult({ ok: false, message: data.error || 'Sync failed' });
      }
    } catch (err) {
      setKnowledgeResult({ ok: false, message: err instanceof Error ? err.message : 'Network error' });
    }
    setKnowledgeLoading(false);
  }

  async function runDemoReset() {
    setDemoLoading(true);
    setDemoResult(null);
    try {
      const res = await fetch('/api/admin/demo/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${prompt('Enter CRON_SECRET:')}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDemoResult({
          ok: true,
          message: `Reset demo accounts: ${(data.reset ?? []).join(', ')}`,
          details: data,
        });
      } else {
        setDemoResult({ ok: false, message: data.error || 'Reset failed' });
      }
    } catch (err) {
      setDemoResult({ ok: false, message: err instanceof Error ? err.message : 'Network error' });
    }
    setDemoLoading(false);
  }

  async function runHelpIngest() {
    setHelpLoading(true);
    setHelpResult(null);
    try {
      const res = await fetch('/api/admin/help/ingest', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setHelpResult({
          ok: true,
          message: `Ingested ${data.succeeded ?? data.count ?? 0} help articles.`,
          details: data,
        });
      } else {
        setHelpResult({ ok: false, message: data.error || 'Ingest failed' });
      }
    } catch (err) {
      setHelpResult({ ok: false, message: err instanceof Error ? err.message : 'Network error' });
    }
    setHelpLoading(false);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-1">Sync & Data</h1>
      <p className="text-gray-400 text-sm mb-6">Manually trigger knowledge sync, demo reset, and data operations. These also run automatically via daily cron jobs.</p>

      {/* Last sync status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 flex items-center gap-3">
        <Clock className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm text-gray-400">Last knowledge sync</p>
          {statusLoading ? (
            <p className="text-white text-sm">Loading...</p>
          ) : status?.lastSynced ? (
            <p className="text-white text-sm font-medium">{formatDate(status.lastSynced)}</p>
          ) : (
            <p className="text-amber-400 text-sm font-medium">Never synced — run a sync now</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <ActionCard
          title="Knowledge Sync"
          description="Re-embeds all help articles and course lessons into the vector database. Updates the knowledge timestamp. Runs daily at 3:00 AM UTC via cron."
          icon={BookOpen}
          buttonLabel="Run Knowledge Sync"
          onAction={runKnowledgeSync}
          result={knowledgeResult}
          loading={knowledgeLoading}
        />

        <ActionCard
          title="Help Article Ingest"
          description="Re-ingests all help articles from lib/help/articles.ts into the help_articles table with embeddings. Use this after updating article content."
          icon={Database}
          buttonLabel="Re-ingest Help Articles"
          onAction={runHelpIngest}
          result={helpResult}
          loading={helpLoading}
        />

        <ActionCard
          title="Demo Account Reset"
          description="Clears and re-seeds all demo accounts (tutorial, visitor, contractor, lister) with fresh data. Runs daily at midnight UTC via cron. Requires CRON_SECRET."
          icon={Users}
          buttonLabel="Reset Demo Accounts"
          onAction={runDemoReset}
          result={demoResult}
          loading={demoLoading}
        />
      </div>

      <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Cron Schedule</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Demo Reset</span>
            <code className="text-gray-500">0 0 * * *</code>
            <span className="text-gray-500">Daily at midnight UTC</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Knowledge Sync</span>
            <code className="text-gray-500">0 3 * * *</code>
            <span className="text-gray-500">Daily at 3:00 AM UTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
