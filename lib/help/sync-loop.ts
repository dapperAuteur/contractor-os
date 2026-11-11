// lib/help/sync-loop.ts
// The browser half of the chunked help sync: call the route with a cursor, add up the counts, wait
// when Mistral asked for a pause, and stop when the server says done (or something is wrong).
// Same idea as witus-learn's /admin/rag "Run all": the loop lives in the browser, so no single
// request has to outlast the function's time limit. Pure (no fetch, no React) so it can be tested.

import type { ChunkResult, FailedArticle } from './embed-sync.ts';

export interface LoopProgress {
  total: number;
  cursor: number;
  embedded: number;
  skipped: number;
  removed: number;
  failed: FailedArticle[];
  /** Set while the loop waits for Mistral's retry delay. */
  waitingMs?: number;
}

export interface LoopOutcome extends LoopProgress {
  done: boolean;
  /** Why the loop ended early: a server error, a spent daily quota, or no progress. */
  error?: string;
  timestamp?: string;
}

export type ChunkCaller = (cursor: number) => Promise<ChunkResult & { timestamp?: string }>;

export async function runSyncLoop(opts: {
  callChunk: ChunkCaller;
  sleep: (ms: number) => Promise<void>;
  onProgress?: (p: LoopProgress) => void;
  /** Hard stop so a bug can never loop forever. 107 articles take one chunk; the union re-embed may take several. */
  maxChunks?: number;
}): Promise<LoopOutcome> {
  const maxChunks = opts.maxChunks ?? 40;
  const out: LoopOutcome = {
    total: 0, cursor: 0, embedded: 0, skipped: 0, removed: 0, failed: [], done: false,
  };
  let stalled = 0;

  for (let i = 0; i < maxChunks; i++) {
    let chunk: ChunkResult & { timestamp?: string };
    try {
      chunk = await opts.callChunk(out.cursor);
    } catch (e) {
      out.error = e instanceof Error ? e.message : String(e);
      return out;
    }
    const before = out.cursor;
    out.total = chunk.total;
    out.cursor = chunk.cursor;
    out.embedded += chunk.embedded;
    out.skipped += chunk.skipped;
    out.removed += chunk.removed;
    out.failed = [...out.failed, ...chunk.failed];
    out.timestamp = chunk.timestamp ?? out.timestamp;

    if (chunk.done) {
      out.done = true;
      opts.onProgress?.({ ...out });
      return out;
    }
    if (chunk.stoppedReason === 'quota') {
      out.error = chunk.error ?? 'Mistral limit spent.';
      return out;
    }
    if (chunk.waitMs) {
      opts.onProgress?.({ ...out, waitingMs: chunk.waitMs });
      await opts.sleep(chunk.waitMs);
    } else {
      opts.onProgress?.({ ...out });
    }
    // A chunk that moved nothing and asked for no wait is stuck; give it one more try, then stop.
    stalled = out.cursor === before && !chunk.waitMs ? stalled + 1 : 0;
    if (stalled >= 2) {
      out.error = `Stopped at article ${out.cursor + 1} of ${out.total}: no progress in two chunks.`;
      return out;
    }
  }
  out.error = `Stopped after ${maxChunks} chunks at article ${out.cursor + 1} of ${out.total}. Run it again to continue.`;
  return out;
}
