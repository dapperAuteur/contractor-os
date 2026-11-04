// File: tests/help-embed-sync.test.ts
// The chunked help-article embedding sync (lib/help/embed-sync.ts), its Gemini error parsing
// (lib/ai/gemini-embed.ts) and the browser loop (lib/help/sync-loop.ts), against a mocked embedder,
// an in-memory store and a fake clock. Run with `npm run test:sync`.
//
// What these pin, from the /admin/sync failures of 2026-11-04 (429 on
// EmbedContentRequestsPerMinutePerUserPerProjectPerModel-FreeTier, limit 100):
//   - requests are spaced at least HELP_SYNC_MIN_INTERVAL_MS apart, so a minute never sees more
//     than HELP_SYNC_REQUESTS_PER_MINUTE of them;
//   - a 429 waits for Google's retryDelay and retries, a bounded number of times;
//   - unchanged articles are skipped, and rows are never wiped before re-embedding;
//   - a run longer than one request's budget returns a cursor, and the loop finishes it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GEMINI_EMBED_FREE_TIER_REQUESTS_PER_MINUTE,
  GeminiEmbedError,
  HELP_SYNC_MIN_INTERVAL_MS,
  HELP_SYNC_REQUESTS_PER_MINUTE,
  createGeminiEmbedder,
  parseRetryDelayMs,
  summarizeGeminiError,
} from '../lib/ai/gemini-embed.ts';
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

/** A 429 body shaped like the ones of 2026-11-04. */
function quota429(retryDelay: string, sentence: string): string {
  return JSON.stringify({
    error: {
      code: 429,
      message: `You exceeded your current quota... Embed content requests per minute limit exceeded on Free Tier.\nPlease retry in ${sentence}.`,
      status: 'RESOURCE_EXHAUSTED',
      details: [
        { '@type': 'type.googleapis.com/google.rpc.Help', links: [] },
        {
          '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
          violations: [{
            quotaMetric: 'generativelanguage.googleapis.com/embed_content_free_tier_requests',
            quotaId: 'EmbedContentRequestsPerMinutePerUserPerProjectPerModel-FreeTier',
            quotaValue: '100',
          }],
        },
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay },
      ],
    },
  });
}

/** Embedder that records call times and costs `latencyMs` of fake time per call. */
function recordingEmbedder(clock: Clock, latencyMs = 200, failures: Record<number, GeminiEmbedError | Error> = {}) {
  const calls: number[] = [];
  const embed = async () => {
    const i = calls.length;
    calls.push(clock.now());
    await clock.sleep(latencyMs);
    const f = failures[i];
    if (f) throw f;
    return [0.1, 0.2, 0.3];
  };
  return { embed, calls };
}

// ── constants and error parsing ─────────────────────────────────────────────────────────────────

test('the sync budget stays under the free-tier quota', () => {
  assert.equal(GEMINI_EMBED_FREE_TIER_REQUESTS_PER_MINUTE, 100);
  assert.ok(HELP_SYNC_REQUESTS_PER_MINUTE < GEMINI_EMBED_FREE_TIER_REQUESTS_PER_MINUTE);
  assert.ok(60_000 / HELP_SYNC_MIN_INTERVAL_MS <= HELP_SYNC_REQUESTS_PER_MINUTE);
});

test('parseRetryDelayMs reads RetryInfo and the more precise sentence', () => {
  assert.equal(parseRetryDelayMs(quota429('45s', '45.701064232s')), 45_702);
  assert.equal(parseRetryDelayMs(quota429('0s', '680.777463ms')), 681);
  assert.equal(parseRetryDelayMs(JSON.stringify({ error: { details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '12s' }] } })), 12_000);
  assert.equal(parseRetryDelayMs('not json, no delay'), null);
});

test('summarizeGeminiError gives one line naming the quota', () => {
  const s = summarizeGeminiError(429, quota429('45s', '45.7s'));
  assert.match(s, /^Rate limited by Google \(429 RESOURCE_EXHAUSTED: EmbedContentRequestsPerMinutePerUserPerProjectPerModel-FreeTier \(limit 100\), retry in 46s\)$/);
  assert.ok(!s.includes('\n'));
  assert.match(summarizeGeminiError(400, JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: 'bad\nmore' } })), /^Google embedding error 400 INVALID_ARGUMENT: bad$/);
});

test('createGeminiEmbedder sends the key as a header only and maps errors', async () => {
  let seenUrl = '';
  let seenHeaders: Record<string, string> = {};
  const fakeFetch = (async (url: string, init: RequestInit) => {
    seenUrl = url;
    seenHeaders = init.headers as Record<string, string>;
    return new Response(quota429('3s', '3s'), { status: 429 });
  }) as unknown as typeof fetch;
  const embed = createGeminiEmbedder('k-test-not-real', fakeFetch);
  await assert.rejects(embed('x'), (e: unknown) => {
    assert.ok(e instanceof GeminiEmbedError);
    assert.equal(e.isRateLimit, true);
    assert.equal(e.retryAfterMs, 3_000);
    assert.ok(!e.summary.includes('k-test-not-real'));
    return true;
  });
  assert.ok(!seenUrl.includes('k-test-not-real'));
  assert.equal(seenHeaders['x-goog-api-key'], 'k-test-not-real');
});

// ── pacing ──────────────────────────────────────────────────────────────────────────────────────

test('requests start at least the minimum interval apart, never more than the budget a minute', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const { embed, calls } = recordingEmbedder(clock, 150);
  const result = await runHelpSyncChunk({
    articles: articles(120), store, embed, clock,
    pacer: new Pacer(HELP_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 10 * 60_000,
  });
  assert.equal(result.done, true);
  assert.equal(result.embedded, 120);
  for (let i = 1; i < calls.length; i++) {
    assert.ok(calls[i] - calls[i - 1] >= HELP_SYNC_MIN_INTERVAL_MS, `gap ${i} was ${calls[i] - calls[i - 1]}`);
  }
  // Sliding 60 s window: never more than HELP_SYNC_REQUESTS_PER_MINUTE starts.
  for (let i = 0; i < calls.length; i++) {
    const inWindow = calls.filter((t) => t >= calls[i] && t < calls[i] + 60_000).length;
    assert.ok(inWindow <= HELP_SYNC_REQUESTS_PER_MINUTE, `window at ${i} had ${inWindow}`);
  }
});

// ── 429 retry-after ─────────────────────────────────────────────────────────────────────────────

test('a 429 waits for Google\'s retry delay, then succeeds on retry', async () => {
  const clock = fakeClock();
  const { store, upserts } = memoryStore();
  const { embed, calls } = recordingEmbedder(clock, 100, { 1: new GeminiEmbedError(429, quota429('4s', '4.03450376s')) });
  const result = await runHelpSyncChunk({
    articles: articles(3), store, embed, clock,
    pacer: new Pacer(HELP_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 40_000,
  });
  assert.equal(result.done, true);
  assert.equal(result.embedded, 3);
  assert.deepEqual(result.failed, []);
  assert.deepEqual(upserts, ['Article 1', 'Article 2', 'Article 3']);
  assert.ok(clock.sleeps.includes(4_035), `slept ${JSON.stringify(clock.sleeps)}`);
  assert.equal(calls.length, 4); // one retry
});

test('429 retries are bounded; the article is reported with a one-line message', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const err = () => new GeminiEmbedError(429, quota429('1s', '1s'));
  const { embed, calls } = recordingEmbedder(clock, 100, { 0: err(), 1: err(), 2: err(), 3: err() });
  const result = await runHelpSyncChunk({
    articles: articles(2), store, embed, clock,
    pacer: new Pacer(HELP_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 40_000,
    maxRetries: 3,
  });
  assert.equal(calls.length, 5); // 1 + 3 retries for article 1, then article 2 succeeds
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].title, 'Article 1');
  assert.match(result.failed[0].message, /^Rate limited by Google/);
  assert.match(result.failed[0].detail ?? '', /RESOURCE_EXHAUSTED/);
  assert.equal(result.embedded, 1);
  assert.equal(result.done, true);
});

test('a retry delay that does not fit the chunk returns waitMs and keeps the cursor on that article', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const { embed } = recordingEmbedder(clock, 100, { 2: new GeminiEmbedError(429, quota429('45s', '45.7s')) });
  const result = await runHelpSyncChunk({
    articles: articles(5), store, embed, clock,
    pacer: new Pacer(HELP_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 20_000,
  });
  assert.equal(result.done, false);
  assert.equal(result.stoppedReason, 'rate_limit');
  assert.equal(result.cursor, 2);
  assert.equal(result.waitMs, 45_700);
  assert.equal(result.embedded, 2);
});

test('a retry delay longer than a minute stops the run as a spent daily quota', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const { embed } = recordingEmbedder(clock, 100, { 0: new GeminiEmbedError(429, quota429('3600s', '3600s')) });
  const result = await runHelpSyncChunk({
    articles: articles(3), store, embed, clock,
    pacer: new Pacer(HELP_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 40_000,
  });
  assert.equal(result.stoppedReason, 'quota');
  assert.equal(result.cursor, 0);
  assert.match(result.error ?? '', /daily quota/);
});

// ── skip unchanged, never wipe ──────────────────────────────────────────────────────────────────

test('unchanged articles are skipped; changed, missing and unembedded ones are embedded; stale rows go', async () => {
  const clock = fakeClock();
  const src = articles(4);
  const { store, upserts, deletes, rows } = memoryStore([
    { ...src[0] },                                  // unchanged
    { ...src[1], content: 'old body' },             // changed
    { ...src[2], embedded: false },                 // row without an embedding
    { title: 'Retired article', content: 'x', role: 'all' }, // no longer in the source
  ]);
  const { embed, calls } = recordingEmbedder(clock);
  const result = await runHelpSyncChunk({
    articles: src, store, embed, clock,
    pacer: new Pacer(HELP_SYNC_MIN_INTERVAL_MS, clock),
    timeBudgetMs: 40_000,
  });
  assert.equal(result.skipped, 1);
  assert.equal(result.embedded, 3);
  assert.equal(result.removed, 1);
  assert.deepEqual(upserts, ['Article 2', 'Article 3', 'Article 4']);
  assert.deepEqual(deletes, ['Retired article']);
  assert.equal(calls.length, 3);
  assert.equal(rows.get('Article 2')?.content, 'Body 2');
});

test('a second run embeds nothing', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const pacer = new Pacer(HELP_SYNC_MIN_INTERVAL_MS, clock);
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
  const { embed, calls } = recordingEmbedder(clock);
  const r = await runHelpSyncChunk({
    articles: src, store, embed, clock, force: true,
    pacer: new Pacer(HELP_SYNC_MIN_INTERVAL_MS, clock), timeBudgetMs: 40_000,
  });
  assert.equal(calls.length, 3);
  assert.equal(r.embedded, 3);
  assert.equal(r.skipped, 0);
});

test('a failed article keeps its previous row (nothing is deleted up front)', async () => {
  const clock = fakeClock();
  const src = articles(2);
  const { store, rows, deletes } = memoryStore([{ ...src[0], content: 'old' }]);
  const { embed } = recordingEmbedder(clock, 100, { 0: new Error('network down') });
  const r = await runHelpSyncChunk({
    articles: src, store, embed, clock,
    pacer: new Pacer(HELP_SYNC_MIN_INTERVAL_MS, clock), timeBudgetMs: 40_000,
  });
  assert.equal(r.failed.length, 1);
  assert.equal(r.failed[0].message, 'network down');
  assert.deepEqual(deletes, []);
  assert.equal(rows.get('Article 1')?.content, 'old');
});

// ── chunked progress ────────────────────────────────────────────────────────────────────────────

test('107 articles do not fit one 40 s chunk; the browser loop finishes them across chunks', async () => {
  const clock = fakeClock();
  const { store, rows } = memoryStore();
  const pacer = new Pacer(HELP_SYNC_MIN_INTERVAL_MS, clock);
  const { embed, calls } = recordingEmbedder(clock, 300, { 50: new GeminiEmbedError(429, quota429('30s', '30s')) });
  const src = articles(107);
  const cursors: number[] = [];
  const progress: number[] = [];

  const outcome = await runSyncLoop({
    sleep: clock.sleep,
    onProgress: (p) => progress.push(p.cursor),
    callChunk: async (cursor) => {
      cursors.push(cursor);
      return runHelpSyncChunk({ articles: src, store, embed, clock, pacer, cursor, timeBudgetMs: 40_000 });
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
  assert.equal(calls.length, 108); // one retried 429
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
    callChunk: async () => { throw new Error('GOOGLE_GEMINI_API_KEY_WORK_WITUS is not set.'); },
  });
  assert.equal(outcome.done, false);
  assert.match(outcome.error ?? '', /not set/);
});

test('the cron runner loops chunks in one invocation and waits out a 429', async () => {
  const clock = fakeClock();
  const { store } = memoryStore();
  const { embed } = recordingEmbedder(clock, 200, { 5: new GeminiEmbedError(429, quota429('20s', '20s')) });
  const totals = await runHelpSyncUntilDone({
    articles: articles(30), store, embed, clock,
    pacer: new Pacer(HELP_SYNC_MIN_INTERVAL_MS, clock),
    totalBudgetMs: 95_000, chunkBudgetMs: 15_000,
  });
  assert.equal(totals.done, true);
  assert.equal(totals.embedded, 30);
  assert.equal(totals.failed.length, 0);
});
