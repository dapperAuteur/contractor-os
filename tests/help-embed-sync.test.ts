// File: tests/help-embed-sync.test.ts
// The chunked help-article embedding sync (lib/help/embed-sync.ts) on batched Mistral requests, and
// the browser loop (lib/help/sync-loop.ts), against a mocked batch embedder, an in-memory store and a
// fake clock. Run with `npm run test:sync`. The embedder itself is tests/mistral-embed.test.ts.
//
// What these pin:
//   - articles go to Mistral in batches (at most batchMaxTexts texts and batchMaxTokens estimated
//     tokens a request), and request starts are spaced at least EMBED_SYNC_MIN_INTERVAL_MS apart;
//   - a 429 waits for Retry-After (or a backoff) and retries the same batch, a bounded number of times;
//   - unchanged articles are skipped, and rows are never wiped before re-embedding;
//   - a run longer than one request's budget returns a cursor, and the loop finishes it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BATCH_MAX_TEXTS,
  EMBED_SYNC_MIN_INTERVAL_MS,
  EMBED_SYNC_REQUESTS_PER_MINUTE,
  MAX_REQUEST_TOKENS,
  MISTRAL_EMBED_REQUESTS_PER_MINUTE,
  MistralEmbedError,
  estimateTokens,
} from '../lib/ai/mistral-embed.ts';
import {
  Pacer,
  runHelpSyncChunk,
  runHelpSyncUntilDone,
  type Clock,
  type HelpArticleStore,
  type SyncArticle,
} from '../lib/help/embed-sync.ts';
import { runSyncLoop } from '../lib/help/sync-loop.ts';

// ── fakes ────────────────────────────────────────────────────────────────────────────────────────

function fakeClock(): Clock & { sleeps: number[] } {
  let t = 1_000_000;
  const sleeps: number[] = [];
  return {
    sleeps,
    now: () => t,
    sleep: async (ms) => {
      sleeps.push(ms);
      t += ms;
    },
  };
}

function memoryStore(initial: (SyncArticle & { embedded?: boolean })[] = []) {
  const rows = new Map<string, SyncArticle & { embedded: boolean }>();
  for (const r of initial) rows.set(r.title, { ...r, embedded: r.embedded ?? true });
  const upserts: string[] = [];
  const deletes: string[] = [];
  const store: HelpArticleStore = {
    listEmbedded: async () => [...rows.values()].filter((r) => r.embedded).map(({ title, content, role }) => ({ title, content, role })),
    listTitles: async () => [...rows.keys()],
    upsert: async (a) => {
      upserts.push(a.title);
      rows.set(a.title, { ...a, embedded: true });
    },
    deleteTitles: async (titles) => {
      for (const t of titles) {
        deletes.push(t);
        rows.delete(t);
      }
    },
  };
  return { store, rows, upserts, deletes };
}

const articles = (n: number): SyncArticle[] =>
  Array.from({ length: n }, (_, i) => ({ title: `Article ${i + 1}`, content: `Body ${i + 1}`, role: 'contractor' }));

/** A Mistral 429, with the Retry-After header value in seconds (or none). */
function rate429(retryAfterSeconds: number | null): MistralEmbedError {
  return new MistralEmbedError(
    429,
    JSON.stringify({ object: 'error', message: 'Requests rate limit exceeded', type: 'rate_limited', code: '1300' }),
    retryAfterSeconds === null ? null : retryAfterSeconds * 1000,
  );
}

/**
 * Batch embedder that records each request (start time and texts) and costs `latencyMs` of fake
 * time. `failures[i]` makes request i throw.
 */
function recordingEmbedder(clock: Clock, latencyMs = 200, failures: Record<number, Error> = {}) {
  const calls: number[] = [];
  const batches: string[][] = [];
  const embed = async (texts: string[]) => {
    const i = calls.length;
    calls.push(clock.now());
    batches.push(texts);
    await clock.sleep(latencyMs);
    const f = failures[i];
    if (f) throw f;
    return texts.map(() => [0.1, 0.2, 0.3]);
  };
  return { embed, calls, batches };
}

const noJitter = () => 0;

// ── constants ───────────────────────────────────────────────────────────────────────────────────

test('the sync budget stays under the per-minute rate constant', () => {
  assert.equal(MISTRAL_EMBED_REQUESTS_PER_MINUTE, 60);
  assert.ok(EMBED_SYNC_REQUESTS_PER_MINUTE < MISTRAL_EMBED_REQUESTS_PER_MINUTE);
  assert.ok(60_000 / EMBED_SYNC_MIN_INTERVAL_MS <= EMBED_SYNC_REQUESTS_PER_MINUTE);
});

// ── batching and pacing ─────────────────────────────────────────────────────────────────────────

test('articles go in batches under the text and token caps; one request covers a small sync', async () => {
  const clock = fakeClock();
  const { store, rows } = memoryStore();
  const { embed, batches } = recordingEmbedder(clock);
  const result = await runHelpSyncChunk({
    articles: articles(10), store, embed, clock,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 40_000,
  });
  assert.equal(result.done, true);
  assert.equal(result.embedded, 10);
  assert.equal(batches.length, 1);
  assert.deepEqual(batches[0][0], 'Article 1\n\nBody 1');
  assert.equal(rows.size, 10);

  // 107 long articles: every request respects both caps.
  const long = Array.from({ length: 107 }, (_, i) => ({ title: `Long ${i}`, content: 'x'.repeat(900), role: 'all' }));
  const big = recordingEmbedder(clock);
  const r2 = await runHelpSyncChunk({
    articles: long, store: memoryStore().store, embed: big.embed, clock,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock), timeBudgetMs: 40_000,
  });
  assert.equal(r2.embedded, 107);
  assert.ok(big.batches.length > 1 && big.batches.length < 20, `requests: ${big.batches.length}`);
  for (const b of big.batches) {
    assert.ok(b.length <= BATCH_MAX_TEXTS);
    const tokens = b.reduce((n, t) => n + estimateTokens(t), 0);
    assert.ok(b.length === 1 || tokens <= MAX_REQUEST_TOKENS, `batch of ${tokens} tokens`);
  }
});

test('requests start at least the minimum interval apart, never more than the budget a minute', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const { embed, calls } = recordingEmbedder(clock, 150);
  const result = await runHelpSyncChunk({
    articles: articles(120), store, embed, clock,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 10 * 60_000,
    batchMaxTexts: 2, // force many requests
  });
  assert.equal(result.done, true);
  assert.equal(result.embedded, 120);
  assert.equal(calls.length, 60);
  for (let i = 1; i < calls.length; i++) {
    assert.ok(calls[i] - calls[i - 1] >= EMBED_SYNC_MIN_INTERVAL_MS, `gap ${i} was ${calls[i] - calls[i - 1]}`);
  }
  for (let i = 0; i < calls.length; i++) {
    const inWindow = calls.filter((t) => t >= calls[i] && t < calls[i] + 60_000).length;
    assert.ok(inWindow <= EMBED_SYNC_REQUESTS_PER_MINUTE, `window at ${i} had ${inWindow}`);
  }
});

// ── 429 retry-after ─────────────────────────────────────────────────────────────────────────────

test("a 429 waits for Mistral's Retry-After, then retries the same batch", async () => {
  const clock = fakeClock();
  const { store, upserts } = memoryStore();
  const { embed, calls, batches } = recordingEmbedder(clock, 100, { 1: rate429(4) });
  const result = await runHelpSyncChunk({
    articles: articles(3), store, embed, clock,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 40_000,
    batchMaxTexts: 2,
  });
  assert.equal(result.done, true);
  assert.equal(result.embedded, 3);
  assert.deepEqual(result.failed, []);
  assert.deepEqual(upserts, ['Article 1', 'Article 2', 'Article 3']);
  assert.ok(clock.sleeps.includes(4_000), `slept ${JSON.stringify(clock.sleeps)}`);
  assert.equal(calls.length, 3); // batch 2 sent twice
  assert.deepEqual(batches[1], batches[2]);
});

test('a 429 with no Retry-After backs off exponentially', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const { embed } = recordingEmbedder(clock, 100, { 0: rate429(null), 1: rate429(null) });
  const r = await runHelpSyncChunk({
    articles: articles(1), store, embed, clock, random: noJitter,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock), timeBudgetMs: 40_000,
  });
  assert.equal(r.embedded, 1);
  assert.ok(clock.sleeps.includes(2_000) && clock.sleeps.includes(4_000), `slept ${JSON.stringify(clock.sleeps)}`);
});

test('429 retries are bounded; the batch is reported with a one-line message', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const { embed, calls } = recordingEmbedder(clock, 100, { 0: rate429(1), 1: rate429(1), 2: rate429(1), 3: rate429(1) });
  const result = await runHelpSyncChunk({
    articles: articles(2), store, embed, clock,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 40_000,
    maxRetries: 3,
    batchMaxTexts: 1,
  });
  assert.equal(calls.length, 5); // 1 + 3 retries for article 1, then article 2 succeeds
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].title, 'Article 1');
  assert.match(result.failed[0].message, /^Rate limited by Mistral \(429, retry in 1s\)/);
  assert.match(result.failed[0].detail ?? '', /rate_limited/);
  assert.equal(result.embedded, 1);
  assert.equal(result.done, true);
});

test('a retry delay that does not fit the chunk returns waitMs and keeps the cursor on that batch', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const { embed } = recordingEmbedder(clock, 100, { 1: rate429(45) });
  const result = await runHelpSyncChunk({
    articles: articles(5), store, embed, clock,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 20_000,
    batchMaxTexts: 2,
  });
  assert.equal(result.done, false);
  assert.equal(result.stoppedReason, 'rate_limit');
  assert.equal(result.cursor, 2);
  assert.equal(result.waitMs, 45_000);
  assert.equal(result.embedded, 2);
});

test('a retry delay longer than a minute stops the run as a spent workspace limit', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const { embed } = recordingEmbedder(clock, 100, { 0: rate429(3600) });
  const result = await runHelpSyncChunk({
    articles: articles(3), store, embed, clock,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 40_000,
  });
  assert.equal(result.stoppedReason, 'quota');
  assert.equal(result.cursor, 0);
  assert.match(result.error ?? '', /workspace limit/);
});

test('a 5xx is retried; a 400 fails the batch without retrying', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const { embed, calls } = recordingEmbedder(clock, 100, {
    0: new MistralEmbedError(503, 'upstream'),
    2: new MistralEmbedError(400, JSON.stringify({ message: 'bad input' })),
  });
  const r = await runHelpSyncChunk({
    articles: articles(2), store, embed, clock, batchMaxTexts: 1,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock), timeBudgetMs: 40_000,
  });
  assert.equal(calls.length, 3);
  assert.equal(r.embedded, 1);
  assert.deepEqual(r.failed.map((f) => [f.title, f.message]), [['Article 2', 'Mistral embedding error 400: bad input']]);
});

// ── skip unchanged, never wipe ──────────────────────────────────────────────────────────────────

test('unchanged articles are skipped; changed, missing and unembedded ones are embedded; stale rows go', async () => {
  const clock = fakeClock();
  const src = articles(4);
  const { store, upserts, deletes, rows } = memoryStore([
    { ...src[0] },                                  // unchanged
    { ...src[1], content: 'old body' },             // changed
    { ...src[2], embedded: false },                 // row without a v2 embedding (Gemini only)
    { title: 'Retired article', content: 'x', role: 'all' }, // no longer in the source
  ]);
  const { embed, batches } = recordingEmbedder(clock);
  const result = await runHelpSyncChunk({
    articles: src, store, embed, clock,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 40_000,
  });
  assert.equal(result.skipped, 1);
  assert.equal(result.embedded, 3);
  assert.equal(result.removed, 1);
  assert.deepEqual(upserts, ['Article 2', 'Article 3', 'Article 4']);
  assert.deepEqual(deletes, ['Retired article']);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 3);
  assert.equal(rows.get('Article 2')?.content, 'Body 2');
});

test('a second run embeds nothing', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const pacer = new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock);
  const first = recordingEmbedder(clock);
  await runHelpSyncChunk({ articles: articles(10), store, embed: first.embed, clock, pacer, timeBudgetMs: 60_000 });
  const second = recordingEmbedder(clock);
  const r = await runHelpSyncChunk({ articles: articles(10), store, embed: second.embed, clock, pacer, timeBudgetMs: 60_000 });
  assert.equal(second.calls.length, 0);
  assert.equal(r.skipped, 10);
  assert.equal(r.done, true);
});

test('force re-embeds unchanged articles', async () => {
  const clock = fakeClock();
  const src = articles(3);
  const { store } = memoryStore(src.map((a) => ({ ...a })));
  const { embed, batches } = recordingEmbedder(clock);
  const r = await runHelpSyncChunk({
    articles: src, store, embed, clock, force: true,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock), timeBudgetMs: 40_000,
  });
  assert.equal(batches.flat().length, 3);
  assert.equal(r.embedded, 3);
  assert.equal(r.skipped, 0);
});

test('a failed batch keeps the previous rows (nothing is deleted up front)', async () => {
  const clock = fakeClock();
  const src = articles(2);
  const { store, rows, deletes } = memoryStore([{ ...src[0], content: 'old' }]);
  const { embed } = recordingEmbedder(clock, 100, { 0: new Error('network down') });
  const r = await runHelpSyncChunk({
    articles: src, store, embed, clock,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock), timeBudgetMs: 40_000,
  });
  assert.equal(r.failed.length, 2);
  assert.equal(r.failed[0].message, 'network down');
  assert.deepEqual(deletes, []);
  assert.equal(rows.get('Article 1')?.content, 'old');
  assert.equal(r.done, true);
});

// ── chunked progress ────────────────────────────────────────────────────────────────────────────

test('a sync that does not fit one chunk is finished by the browser loop across chunks', async () => {
  const clock = fakeClock();
  const { store, rows } = memoryStore();
  const pacer = new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock);
  const { embed, calls } = recordingEmbedder(clock, 300, { 12: rate429(30) });
  const src = articles(107);
  const cursors: number[] = [];
  const progress: number[] = [];

  const outcome = await runSyncLoop({
    sleep: clock.sleep,
    onProgress: (p) => progress.push(p.cursor),
    callChunk: async (cursor) => {
      cursors.push(cursor);
      // Small batches and a short budget so the run needs several chunks.
      return runHelpSyncChunk({ articles: src, store, embed, clock, pacer, cursor, timeBudgetMs: 20_000, batchMaxTexts: 4 });
    },
  });

  assert.equal(outcome.done, true, outcome.error);
  assert.equal(outcome.total, 107);
  assert.equal(outcome.embedded, 107);
  assert.equal(outcome.failed.length, 0);
  assert.equal(rows.size, 107);
  assert.ok(cursors.length >= 3, `chunks: ${JSON.stringify(cursors)}`);
  assert.equal(cursors[0], 0);
  for (let i = 1; i < cursors.length; i++) assert.ok(cursors[i] >= cursors[i - 1]);
  assert.equal(calls.length, 28); // 27 batches of up to 4, one retried 429
  assert.equal(progress.at(-1), 107);
});

test('the loop stops on a spent daily quota and reports it', async () => {
  const outcome = await runSyncLoop({
    sleep: async () => {},
    callChunk: async () => ({
      total: 10, cursor: 3, done: false, embedded: 3, skipped: 0, removed: 0, failed: [],
      stoppedReason: 'quota', error: 'daily quota spent',
    }),
  });
  assert.equal(outcome.done, false);
  assert.equal(outcome.error, 'daily quota spent');
  assert.equal(outcome.embedded, 3);
});

test('the loop gives up when chunks make no progress', async () => {
  let n = 0;
  const outcome = await runSyncLoop({
    sleep: async () => {},
    callChunk: async () => {
      n++;
      return { total: 10, cursor: 0, done: false, embedded: 0, skipped: 0, removed: 0, failed: [], stoppedReason: 'time' };
    },
  });
  assert.equal(n, 2);
  assert.match(outcome.error ?? '', /no progress/);
});

test('the loop surfaces a server error', async () => {
  const outcome = await runSyncLoop({
    sleep: async () => {},
    callChunk: async () => { throw new Error('MISTRAL_API_KEY is not set.'); },
  });
  assert.equal(outcome.done, false);
  assert.match(outcome.error ?? '', /not set/);
});

test('the cron runner loops chunks in one invocation and waits out a 429', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const { embed } = recordingEmbedder(clock, 200, { 5: rate429(20) });
  const totals = await runHelpSyncUntilDone({
    articles: articles(30), store, embed, clock,
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, clock),
    totalBudgetMs: 95_000, chunkBudgetMs: 15_000, batchMaxTexts: 2,
  });
  assert.equal(totals.done, true);
  assert.equal(totals.embedded, 30);
  assert.equal(totals.failed.length, 0);
});
