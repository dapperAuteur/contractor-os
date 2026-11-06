'use client';

// components/admin/HelpSyncCard.tsx
// One /admin/sync card that runs a chunked embedding sync (help articles, or union document chunks):
// it calls `endpoint` with a cursor until the server says done (lib/help/sync-loop.ts), shows
// progress and any wait Mistral asked for, and ends with a short summary. Each failure is one line;
// Mistral's full error is behind a details toggle instead of being dumped as JSON.

import { useState } from 'react';
import { CheckCircle, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { runSyncLoop, type LoopOutcome, type LoopProgress } from '@/lib/help/sync-loop';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function HelpSyncCard({
  title,
  description,
  icon: Icon,
  buttonLabel,
  endpoint,
  body,
  onDone,
  disabled,
  onRunningChange,
  unit = 'article',
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  buttonLabel: string;
  endpoint: string;
  /** Extra JSON merged into every chunk request (e.g. { force: true }). */
  body?: Record<string, unknown>;
  onDone?: (outcome: LoopOutcome) => void;
  /** True while another sync card is running; all share one Mistral per-minute budget. */
  disabled?: boolean;
  onRunningChange?: (running: boolean) => void;
  /** What one item is called in the progress line ("article", "chunk"). */
  unit?: string;
}) {
  const Unit = unit.charAt(0).toUpperCase() + unit.slice(1);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<LoopProgress | null>(null);
  const [outcome, setOutcome] = useState<LoopOutcome | null>(null);

  async function run() {
    setRunning(true);
    onRunningChange?.(true);
    setOutcome(null);
    setProgress(null);
    const result = await runSyncLoop({
      sleep,
      onProgress: setProgress,
      callChunk: async (cursor) => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, cursor }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        return data;
      },
    });
    setOutcome(result);
    setProgress(null);
    setRunning(false);
    onRunningChange?.(false);
    onDone?.(result);
  }

  const ok = outcome && outcome.done && outcome.failed.length === 0 && !outcome.error;

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
            onClick={() => void run()}
            disabled={running || disabled}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition min-h-11"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            )}
            {running ? 'Running...' : buttonLabel}
          </button>

          {running && (
            <p className="mt-3 text-sm text-slate-600" role="status">
              {progress
                ? `${Unit} ${Math.min(progress.cursor, progress.total)} of ${progress.total}: ${progress.embedded} embedded, ${progress.skipped} unchanged, ${progress.failed.length} failed.`
                : 'Starting...'}
              {progress?.waitingMs
                ? ` Mistral asked for a pause; waiting ${Math.ceil(progress.waitingMs / 1000)}s, then continuing.`
                : ''}
            </p>
          )}

          {outcome && (
            <div className={`mt-3 flex items-start gap-2 text-sm ${ok ? 'text-green-700' : 'text-red-700'}`}>
              {ok ? (
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0" role={ok ? 'status' : 'alert'}>
                <p>
                  {outcome.done ? 'Done' : 'Stopped'}: {outcome.embedded} embedded, {outcome.skipped} unchanged,{' '}
                  {outcome.failed.length} failed
                  {outcome.removed ? `, ${outcome.removed} old rows removed` : ''}
                  {outcome.total ? ` (of ${outcome.total} ${unit}s)` : ''}.
                </p>
                {outcome.error && <p className="mt-1">{outcome.error}</p>}
                {outcome.failed.length > 0 && (
                  <ul className="mt-2 space-y-1 text-slate-700">
                    {outcome.failed.map((f, i) => (
                      <li key={`${f.title}-${i}`}>
                        <span className="font-medium">{f.title}</span>: {f.message}
                        {f.detail && (
                          <details className="mt-0.5">
                            <summary className="cursor-pointer text-xs text-slate-500">Full error</summary>
                            <pre className="mt-1 max-h-48 overflow-auto text-xs text-slate-500 whitespace-pre-wrap break-all">
                              {f.detail}
                            </pre>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
