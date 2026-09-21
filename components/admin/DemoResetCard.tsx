'use client';

// components/admin/DemoResetCard.tsx
// Admin dashboard control for the demo-account reset that otherwise runs nightly via cron.
// Two-step on purpose: the reset wipes the demo accounts before reseeding them, so a stray click
// in the middle of a live demo would empty the account someone is looking at.

import { useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';

type Phase = 'idle' | 'confirming' | 'running';

export default function DemoResetCard() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[] | null>(null);

  async function runReset() {
    setPhase('running');
    setError(null);
    try {
      const res = await fetch('/api/admin/demo/reset', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Reset failed (${res.status})`);
      setDone(body.reset ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setPhase('idle');
    }
  }

  return (
    <section aria-labelledby="demo-reset-heading" className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 id="demo-reset-heading" className="text-sm font-semibold text-slate-900 mb-1">Demo accounts</h2>
      <p className="text-xs text-slate-500 mb-4">
        Wipes the tutorial, visitor, contractor and lister demo accounts and reseeds them with sample
        data. The same reset runs automatically every night at 00:00 UTC.
      </p>

      {phase === 'confirming' ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-amber-800">Anyone signed in to a demo account will see it reset. Continue?</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={runReset}
              className="min-h-11 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-500 transition"
            >
              Yes, reset now
            </button>
            <button
              type="button"
              onClick={() => setPhase('idle')}
              className="min-h-11 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setDone(null); setPhase('confirming'); }}
          disabled={phase === 'running'}
          aria-busy={phase === 'running'}
          className="min-h-11 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-500 transition disabled:opacity-50"
        >
          {phase === 'running'
            ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Resetting…</>
            : <><RotateCcw className="w-4 h-4" aria-hidden="true" /> Reset demo data</>}
        </button>
      )}

      <div aria-live="polite">
        {done && (
          <p className="mt-3 text-sm text-lime-700">
            Reset complete: {done.length > 0 ? done.join(', ') : 'demo accounts'}.
          </p>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
