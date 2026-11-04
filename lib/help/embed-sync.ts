// File: lib/help/embed-sync.ts
// The help-article embedding sync, in chunks that fit one serverless request.
//
// Callers: /api/admin/knowledge/refresh (changed articles only), /api/admin/help/ingest (every
// article), /api/cron/knowledge-sync (changed only, loops chunks in one invocation). The wiring to
// Supabase and the Gemini key lives in lib/admin/syncKnowledge.ts; this file takes its store,
// embedder and clock as arguments so tests/help-embed-sync.test.ts can run it against fakes.
//
// What a chunk does, in order:
//   1. On the first chunk only (cursor 0), delete rows whose title is no longer an article. Rows are
//      never wiped up front any more: the old code deleted every contractor row first, so each 429
//      left that article missing from the help chat until the next full run succeeded.
//   2. Walk the articles from `cursor`. An article whose stored title, content and role hash to the
//      same value as the source, and which has an embedding, is skipped (unless `force`).
//   3. Embed the rest, one request at a time, at most one per `minIntervalMs`
//      (HELP_SYNC_MIN_INTERVAL_MS, under Google's 100-a-minute free tier; see lib/ai/gemini-embed.ts).
//   4. A 429 waits for Google's retry delay and tries again, up to `maxRetries` times. If the wait
//      will not fit in the chunk's time budget, the chunk stops and returns `waitMs`: the admin page
//      waits that long and asks for the next chunk. A delay longer than `maxRetryWaitMs` is a daily
//      quota, not a per-minute one, and stops the run with `stoppedReason: 'quota'`.
//   5. Stop before the time budget runs out and return the cursor to continue from.
//
// No new column: the stored row already holds the title, content and role it was embedded from, so
// "unchanged" is a hash of those three on both sides. A change of embedding model or dimensions is
// NOT detected (rows do not record the model); run Re-ingest (force) after changing either.

import { createHash } from 'node:crypto';
import { GeminiEmbedError, type Embedder } from '../ai/gemini-embed.ts';

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
  /** When set, wait this long before asking for the next chunk (Google's retry delay). */
  waitMs?: number;
  /** Why the chunk stopped before the end. 'quota' means stop the run: the daily quota is spent. */
  stoppedReason?: 'time' | 'rate_limit' | 'quota';
  /** Set with stoppedReason 'quota'. */
  error?: string;
}

export interface ChunkOptions {
  articles: SyncArticle[];
  store: HelpArticleStore;
  embed: Embedder;
  pacer: Pacer;
  clock?: Clock;
  cursor?: number;
  /** Re-embed every article, changed or not. */
  force?: boolean;
  /** Stop starting new work after this long. Keep well under the route's maxDuration. */
  timeBudgetMs: number;
  /** Allowance for one request to finish once started (checked before starting it). */
  requestAllowanceMs?: number;
  /** 429 retries per article inside one chunk. */
  maxRetries?: number;
  /** A retry delay longer than this is treated as a spent daily quota. */
  maxRetryWaitMs?: number;
  /** Wait used when a 429 carries no retry delay. */
  defaultRetryWaitMs?: number;
}

export async function runHelpSyncChunk(opts: ChunkOptions): Promise<ChunkResult> {
  const clock = opts.clock ?? realClock;
  const start = clock.now();
  const deadline = start + opts.timeBudgetMs;
  const allowance = opts.requestAllowanceMs ?? 5_000;
  const maxRetries = opts.maxRetries ?? 3;
  const maxRetryWaitMs = opts.maxRetryWaitMs ?? 65_000;
  const defaultRetryWaitMs = opts.defaultRetryWaitMs ?? 30_000;
  const { articles, store, embed, pacer } = opts;
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

  while (cursor < total) {
    const article = articles[cursor];
    if (!opts.force && storedHashes.get(article.title) === articleHash(article)) {
      result.skipped++;
      cursor++;
      continue;
    }

    let attempts = 0;
    let outcome: 'ok' | 'failed' | 'stop' = 'failed';
    while (true) {
      if (clock.now() + pacer.delayMs() + allowance > deadline) {
        result.stoppedReason = 'time';
        outcome = 'stop';
        break;
      }
      await pacer.wait();
      try {
        const vector = await embed(`${article.title}\n\n${article.content}`);
        await store.upsert(article, vector);
        outcome = 'ok';
        break;
      } catch (e) {
        if (e instanceof GeminiEmbedError && e.isRateLimit) {
          const wait = e.retryAfterMs ?? defaultRetryWaitMs;
          if (wait > maxRetryWaitMs) {
            result.stoppedReason = 'quota';
            result.error = `${e.summary}. That is longer than a per-minute window, so the daily quota is probably spent; it resets at midnight Pacific time.`;
            outcome = 'stop';
            break;
          }
          attempts++;
          if (attempts > maxRetries) {
            result.failed.push({ title: article.title, message: e.summary, detail: e.detail });
            outcome = 'failed';
            break;
          }
          if (clock.now() + wait + allowance > deadline) {
            result.stoppedReason = 'rate_limit';
            result.waitMs = wait;
            outcome = 'stop';
            break;
          }
          await clock.sleep(wait);
          continue;
        }
        if (e instanceof GeminiEmbedError && e.status >= 500 && attempts < maxRetries) {
          attempts++;
          await clock.sleep(2_000 * attempts);
          continue;
        }
        const message = e instanceof GeminiEmbedError
          ? e.summary
          : e instanceof Error ? e.message : String(e);
        result.failed.push({
          title: article.title,
          message,
          detail: e instanceof GeminiEmbedError ? e.detail : undefined,
        });
        outcome = 'failed';
        break;
      }
    }

    if (outcome === 'stop') break;
    if (outcome === 'ok') result.embedded++;
    cursor++;
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
