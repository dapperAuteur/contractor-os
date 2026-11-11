// File: lib/union/embed-backfill.ts
// Re-embeds existing union_document_chunks into `embedding_v2` (mistral-embed), one chunk of work
// per request, for the "Re-embed Union Documents" button on /admin/sync. Uploads made after the move
// already write `embedding_v2` (lib/union/chunks.ts); this covers the rows written before it, which
// carry only the legacy 768-dimension Gemini `embedding` and are invisible to match_union_chunks_v2
// until re-embedded. The chunk text is stored on the row, so no document is downloaded again.
//
// Work list: rows WHERE embedding_v2 IS NULL, walked in id order with a keyset (`id > afterId`), so a
// batch that fails is passed over for the rest of this request instead of being retried forever.
// The result has the same shape as the help sync's (ChunkResult), so the same browser loop
// (lib/help/sync-loop.ts) and card drive it: `total` is every chunk row, `cursor` is how many have a
// v2 embedding, and `done` means this request reached the end of the list. Failed rows stay NULL and
// are picked up by the next press.

import { BATCH_MAX_TEXTS, MAX_REQUEST_TOKENS, estimateTokens, type BatchEmbedder } from '../ai/mistral-embed.ts';
import {
  embedBatchWithRetry,
  realClock,
  type ChunkResult,
  type Clock,
  type Pacer,
  type RetryOptions,
} from '../help/embed-sync.ts';

export interface PendingChunk {
  id: string;
  text: string;
  /** For the failed list, e.g. "IATSE 317 contract, section 4". */
  label: string;
}

export interface UnionChunkStore {
  countAll(): Promise<number>;
  countPending(): Promise<number>;
  /** Rows with no v2 embedding, id ascending, with id > afterId when given. */
  listPending(limit: number, afterId: string | null): Promise<PendingChunk[]>;
  saveV2(id: string, vector: number[]): Promise<void>;
}

export interface UnionBackfillOptions extends RetryOptions {
  store: UnionChunkStore;
  embed: BatchEmbedder;
  pacer: Pacer;
  clock?: Clock;
  timeBudgetMs: number;
  batchMaxTexts?: number;
  batchMaxTokens?: number;
}

export async function runUnionBackfillChunk(opts: UnionBackfillOptions): Promise<ChunkResult> {
  const clock = opts.clock ?? realClock;
  const deadline = clock.now() + opts.timeBudgetMs;
  const maxTexts = opts.batchMaxTexts ?? BATCH_MAX_TEXTS;
  const maxTokens = opts.batchMaxTokens ?? MAX_REQUEST_TOKENS;
  const { store } = opts;

  const total = await store.countAll();
  const result: ChunkResult = {
    total, cursor: 0, done: false, embedded: 0, skipped: 0, removed: 0, failed: [],
  };

  let afterId: string | null = null;
  let reachedEnd = false;
  outer: while (true) {
    const page = await store.listPending(maxTexts, afterId);
    if (page.length === 0) {
      reachedEnd = true;
      break;
    }
    // Split the page by the token cap; each piece is one request.
    let i = 0;
    while (i < page.length) {
      const batch: PendingChunk[] = [];
      let tokens = 0;
      while (i < page.length) {
        const t = estimateTokens(page[i].text);
        if (batch.length > 0 && tokens + t > maxTokens) break;
        batch.push(page[i]);
        tokens += t;
        i++;
      }
      const attempt = await embedBatchWithRetry(batch.map((c) => c.text), { ...opts, clock, deadline });
      if (attempt.kind === 'stop') {
        result.stoppedReason = attempt.reason;
        if (attempt.waitMs !== undefined) result.waitMs = attempt.waitMs;
        if (attempt.error) result.error = attempt.error;
        break outer;
      }
      if (attempt.kind === 'failed') {
        for (const c of batch) result.failed.push({ title: c.label, message: attempt.message, detail: attempt.detail });
      } else {
        for (let k = 0; k < batch.length; k++) {
          try {
            await store.saveV2(batch[k].id, attempt.vectors[k]);
            result.embedded++;
          } catch (e) {
            result.failed.push({ title: batch[k].label, message: e instanceof Error ? e.message : String(e) });
          }
        }
      }
      afterId = batch[batch.length - 1].id;
    }
  }

  result.cursor = Math.max(0, total - (await store.countPending()));
  result.done = reachedEnd;
  return result;
}
