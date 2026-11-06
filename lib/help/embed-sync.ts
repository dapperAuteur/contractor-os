// File: lib/help/embed-sync.ts
// The help-article embedding sync, in chunks that fit one serverless request, plus the paced,
// retrying batch call it shares with the union re-embed (lib/union/embed-backfill.ts).
//
// Callers: /api/admin/knowledge/refresh (changed articles only), /api/admin/help/ingest (every
// article), /api/cron/knowledge-sync (changed only, loops chunks in one invocation). The wiring to
// Supabase and the Mistral key lives in lib/admin/syncKnowledge.ts; this file takes its store,
// embedder and clock as arguments so tests/help-embed-sync.test.ts can run it against fakes.
//
// What a chunk does, in order:
//   1. On the first chunk only (cursor 0), delete rows whose title is no longer an article. Rows are
//      never wiped up front, so a failed request leaves the previous row in place.
//   2. Walk the articles from `cursor`. An article whose stored title, content and role hash to the
//      same value as the source, and which has a v2 (Mistral) embedding, is skipped (unless `force`).
//      A row with only the old Gemini `embedding` counts as not embedded, so the first Knowledge Sync
//      after the move re-embeds everything into `embedding_v2`.
//   3. Embed the rest in BATCHES (up to BATCH_MAX_TEXTS texts and MAX_REQUEST_TOKENS estimated
//      tokens per request, lib/ai/mistral-embed.ts), at most one request per `minIntervalMs`
//      (EMBED_SYNC_MIN_INTERVAL_MS).
//   4. A 429 waits for Mistral's Retry-After (or an exponential backoff) and retries the same batch,
//      up to `maxRetries` times. If the wait will not fit in the chunk's time budget, the chunk stops
//      and returns `waitMs`: the admin page waits that long and asks for the next chunk. A delay
//      longer than `maxRetryWaitMs` is not a per-minute limit and stops the run with
//      `stoppedReason: 'quota'`.
//   5. Stop before the time budget runs out and return the cursor to continue from.
//
// "Unchanged" is a hash of the stored title, content and role. A change of embedding model or
// dimensions is NOT detected by the hash (rows do not record the model); the move to Mistral is
// detected only because it writes a new column. Run Re-ingest (force) after any later model change.

import { createHash } from 'node:crypto';
import {
  BATCH_MAX_TEXTS,
  MAX_REQUEST_TOKENS,
  MistralEmbedError,
  backoffMs,
  estimateTokens,
  type BatchEmbedder,
} from '../ai/mistral-embed.ts';

export interface SyncArticle {
  title: string;
  content: string;
  role: string;
}

/** The storage the sync needs. One implementation per database; tests use an in-memory one. */
export interface HelpArticleStore {
  /** Rows for this app that HAVE an embedding (title, content, role only; never the vector). */
  listEmbedded(): Promise<SyncArticle[]>;
  /** Every title stored for this app, embedded or not. */
  listTitles(): Promise<string[]>;
  upsert(article: SyncArticle, embedding: number[]): Promise<void>;
  deleteTitles(titles: string[]): Promise<void>;
}

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Spaces request starts at least `minIntervalMs` apart. One instance per process is shared by every
 * sync route (see lib/admin/syncKnowledge.ts), so two buttons pressed in one warm instance still
 * share one budget.
 */
export class Pacer {
  private lastStart = Number.NEGATIVE_INFINITY;
  private readonly minIntervalMs: number;
  private readonly clock: Clock;

  constructor(minIntervalMs: number, clock: Clock) {
    this.minIntervalMs = minIntervalMs;
    this.clock = clock;
  }

  /** How long the next request would have to wait right now. */
  delayMs(): number {
    return Math.max(0, this.lastStart + this.minIntervalMs - this.clock.now());
  }

  async wait(): Promise<void> {
    const delay = this.delayMs();
    if (delay > 0) await this.clock.sleep(delay);
    this.lastStart = this.clock.now();
  }
}

export function articleHash(a: SyncArticle): string {
  return createHash('sha256').update(JSON.stringify([a.title, a.content, a.role])).digest('hex');
}

export interface FailedArticle {
  title: string;
  /** One line for the list. */
  message: string;
  /** Full error text, shown behind a details toggle. */
  detail?: string;
}

export interface ChunkResult {
  /** Articles in the source list. */
  total: number;
  /** Where the next chunk starts. Equals `total` when done. */
  cursor: number;
  done: boolean;
  embedded: number;
  skipped: number;
  removed: number;
  failed: FailedArticle[];
  /** When set, wait this long before asking for the next chunk (Mistral's retry delay). */
  waitMs?: number;
  /** Why the chunk stopped before the end. 'quota' means stop the run: the daily quota is spent. */
  stoppedReason?: 'time' | 'rate_limit' | 'quota';
  /** Set with stoppedReason 'quota'. */
  error?: string;
}

/** The retry knobs both sync engines share. */
export interface RetryOptions {
  /** Allowance for one request to finish once started (checked before starting it). */
  requestAllowanceMs?: number;
  /** 429 (and 5xx) retries per batch inside one chunk. */
  maxRetries?: number;
  /** A retry delay longer than this is treated as a spent workspace limit, not a per-minute one. */
  maxRetryWaitMs?: number;
  /** Jitter source for the backoff used when a 429 carries no Retry-After (tests pass () => 0). */
  random?: () => number;
}

export interface ChunkOptions extends RetryOptions {
  articles: SyncArticle[];
  store: HelpArticleStore;
  embed: BatchEmbedder;
  pacer: Pacer;
  clock?: Clock;
  cursor?: number;
  /** Re-embed every article, changed or not. */
  force?: boolean;
  /** Stop starting new work after this long. Keep well under the route's maxDuration. */
  timeBudgetMs: number;
  /** Texts per request (default BATCH_MAX_TEXTS). */
  batchMaxTexts?: number;
  /** Estimated tokens per request (default MAX_REQUEST_TOKENS). */
  batchMaxTokens?: number;
}

export type BatchAttempt =
  | { kind: 'ok'; vectors: number[][] }
  | { kind: 'failed'; message: string; detail?: string }
  | { kind: 'stop'; reason: 'time' | 'rate_limit' | 'quota'; waitMs?: number; error?: string };

/**
 * One batch: pace, call, and on a 429 wait and retry the same batch while the chunk's deadline
 * allows. Never throws: the result says whether to save, report the batch as failed, or stop.
 */
export async function embedBatchWithRetry(
  texts: string[],
  ctx: RetryOptions & { embed: BatchEmbedder; pacer: Pacer; clock: Clock; deadline: number },
): Promise<BatchAttempt> {
  const allowance = ctx.requestAllowanceMs ?? 5_000;
  const maxRetries = ctx.maxRetries ?? 3;
  const maxRetryWaitMs = ctx.maxRetryWaitMs ?? 65_000;
  const { clock, pacer, deadline } = ctx;
  let attempts = 0;
  while (true) {
    if (clock.now() + pacer.delayMs() + allowance > deadline) return { kind: 'stop', reason: 'time' };
    await pacer.wait();
    try {
      return { kind: 'ok', vectors: await ctx.embed(texts) };
    } catch (e) {
      if (e instanceof MistralEmbedError && e.isRateLimit) {
        attempts++;
        const wait = e.retryAfterMs ?? backoffMs(attempts, ctx.random);
        if (wait > maxRetryWaitMs) {
          return {
            kind: 'stop',
            reason: 'quota',
            error: `${e.summary}. That is longer than a per-minute window, so a workspace limit (tokens per month) may be spent; check admin.mistral.ai/plateforme/limits.`,
          };
        }
        if (attempts > maxRetries) return { kind: 'failed', message: e.summary, detail: e.detail };
        if (clock.now() + wait + allowance > deadline) return { kind: 'stop', reason: 'rate_limit', waitMs: wait };
        await clock.sleep(wait);
        continue;
      }
      if (e instanceof MistralEmbedError && e.status >= 500 && attempts < maxRetries) {
        attempts++;
        await clock.sleep(2_000 * attempts);
        continue;
      }
      if (e instanceof MistralEmbedError) return { kind: 'failed', message: e.summary, detail: e.detail };
      return { kind: 'failed', message: e instanceof Error ? e.message : String(e) };
    }
  }
}

const articleText = (a: SyncArticle) => `${a.title}\n\n${a.content}`;

export async function runHelpSyncChunk(opts: ChunkOptions): Promise<ChunkResult> {
  const clock = opts.clock ?? realClock;
  const deadline = clock.now() + opts.timeBudgetMs;
  const maxTexts = opts.batchMaxTexts ?? BATCH_MAX_TEXTS;
  const maxTokens = opts.batchMaxTokens ?? MAX_REQUEST_TOKENS;
  const { articles, store } = opts;
  const total = articles.length;
  let cursor = Math.max(0, Math.min(opts.cursor ?? 0, total));

  const result: ChunkResult = {
    total, cursor, done: false, embedded: 0, skipped: 0, removed: 0, failed: [],
  };

  if (cursor === 0) {
    const wanted = new Set(articles.map((a) => a.title));
    const stale = (await store.listTitles()).filter((t) => !wanted.has(t));
    if (stale.length) {
      await store.deleteTitles(stale);
      result.removed = stale.length;
    }
  }

  const storedHashes = new Map<string, string>();
  if (!opts.force) {
    for (const row of await store.listEmbedded()) storedHashes.set(row.title, articleHash(row));
  }
  const unchanged = (a: SyncArticle) => !opts.force && storedHashes.get(a.title) === articleHash(a);

  while (cursor < total) {
    // Collect the next batch from `cursor`: the articles to embed, and the unchanged ones passed on
    // the way (counted only once the batch is settled, so a stopped chunk does not double count).
    const batch: SyncArticle[] = [];
    let passed = 0;
    let tokens = 0;
    let end = cursor;
    while (end < total) {
      const a = articles[end];
      if (unchanged(a)) {
        passed++;
        end++;
        continue;
      }
      const t = estimateTokens(articleText(a));
      if (batch.length > 0 && (batch.length >= maxTexts || tokens + t > maxTokens)) break;
      batch.push(a);
      tokens += t;
      end++;
    }

    if (batch.length === 0) {
      result.skipped += passed;
      cursor = end;
      continue;
    }

    const attempt = await embedBatchWithRetry(batch.map(articleText), { ...opts, clock, deadline });
    if (attempt.kind === 'stop') {
      result.stoppedReason = attempt.reason;
      if (attempt.waitMs !== undefined) result.waitMs = attempt.waitMs;
      if (attempt.error) result.error = attempt.error;
      break;
    }
    if (attempt.kind === 'failed') {
      for (const a of batch) result.failed.push({ title: a.title, message: attempt.message, detail: attempt.detail });
    } else {
      for (let k = 0; k < batch.length; k++) {
        try {
          await store.upsert(batch[k], attempt.vectors[k]);
          result.embedded++;
        } catch (e) {
          result.failed.push({ title: batch[k].title, message: e instanceof Error ? e.message : String(e) });
        }
      }
    }
    result.skipped += passed;
    cursor = end;
  }

  result.cursor = cursor;
  result.done = cursor >= total;
  return result;
}

/** Totals across chunks. */
export interface RunTotals {
  total: number;
  embedded: number;
  skipped: number;
  removed: number;
  failed: FailedArticle[];
  done: boolean;
  cursor: number;
  error?: string;
}

/**
 * Run chunks back to back inside one invocation until done or `totalBudgetMs` is spent. For the
 * cron, which has no browser to loop for it. A run that does not finish resumes from the start the
 * next day, and skips what this one already embedded.
 */
export async function runHelpSyncUntilDone(
  opts: Omit<ChunkOptions, 'cursor' | 'timeBudgetMs'> & { totalBudgetMs: number; chunkBudgetMs?: number },
): Promise<RunTotals> {
  const clock = opts.clock ?? realClock;
  const deadline = clock.now() + opts.totalBudgetMs;
  const totals: RunTotals = {
    total: opts.articles.length, embedded: 0, skipped: 0, removed: 0, failed: [], done: false, cursor: 0,
  };
  let cursor = 0;
  while (true) {
    const remaining = deadline - clock.now();
    if (remaining <= 0) break;
    const chunk = await runHelpSyncChunk({
      ...opts,
      clock,
      cursor,
      timeBudgetMs: Math.min(remaining, opts.chunkBudgetMs ?? remaining),
    });
    totals.embedded += chunk.embedded;
    totals.skipped += chunk.skipped;
    totals.removed += chunk.removed;
    totals.failed.push(...chunk.failed);
    totals.cursor = chunk.cursor;
    if (chunk.done) {
      totals.done = true;
      break;
    }
    if (chunk.stoppedReason === 'quota') {
      totals.error = chunk.error;
      break;
    }
    if (chunk.waitMs) {
      if (clock.now() + chunk.waitMs >= deadline) break;
      await clock.sleep(chunk.waitMs);
    }
    if (chunk.cursor === cursor && !chunk.waitMs) break; // no progress and nothing to wait for
    cursor = chunk.cursor;
  }
  return totals;
}
