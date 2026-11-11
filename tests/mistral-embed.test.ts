// File: tests/mistral-embed.test.ts
// The Mistral embedder (lib/ai/mistral-embed.ts), every embedding writer and reader that uses it,
// the union re-embed engine, and static checks on migration 226 / Neon 0003. Mocked fetch, fake
// Supabase builders and fake time: no network, no database. Run with `npm run test:sync`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  EMBED_DIMS,
  EMBED_ENDPOINT,
  EMBED_MODEL,
  EmbedRateLimitError,
  MistralEmbedError,
  createMistralEmbedder,
  embedQuery,
  embedTexts,
  planBatches,
  readMistralKey,
  retryAfterMs,
} from '../lib/ai/mistral-embed.ts';
import { Pacer, type Clock } from '../lib/help/embed-sync.ts';
import { createHelpArticleStore } from '../lib/help/supabase-store.ts';
import { CHUNK_OVERLAP, CHUNK_SIZE, buildChunkRows, chunkText } from '../lib/union/chunks.ts';
import { runUnionBackfillChunk, type PendingChunk, type UnionChunkStore } from '../lib/union/embed-backfill.ts';
import { createUnionChunkStore } from '../lib/union/supabase-chunk-store.ts';
import { HELP_MATCH_FN, UNION_MATCH_FN, matchHelpArticles, matchUnionChunks } from '../lib/rag/retrieve.ts';

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const KEY = 'mk-test-not-real';
const vec = (x = 0.01) => Array.from({ length: EMBED_DIMS }, () => x);

// ── fakes ────────────────────────────────────────────────────────────────────────────────────────

interface Sent { url: string; headers: Record<string, string>; body: { model: string; input: string[] } }

/** fetch that answers each call from `script` (a status, or a function of the request). */
function fakeFetch(script: ((req: Sent, i: number) => Response)[]) {
  const sent: Sent[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    const req = { url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
    sent.push(req);
    const step = script[Math.min(sent.length - 1, script.length - 1)];
    return step(req, sent.length - 1);
  }) as unknown as typeof fetch;
  return { impl, sent };
}

const ok = (headers: Record<string, string> = {}) => (req: Sent) =>
  new Response(
    JSON.stringify({
      // Reversed on purpose: the embedder must place vectors by `index`, not array order.
      data: req.body.input.map((_, i) => ({ object: 'embedding', index: i, embedding: vec(i / 100) })).reverse(),
      usage: { prompt_tokens: 1 },
    }),
    { status: 200, headers },
  );
const too = (retryAfter?: string) => () =>
  new Response(JSON.stringify({ message: 'Requests rate limit exceeded' }), {
    status: 429,
    headers: retryAfter ? { 'retry-after': retryAfter } : {},
  });

function fakeTime() {
  let t = 5_000_000;
  const sleeps: number[] = [];
  return { now: () => t, sleep: async (ms: number) => { sleeps.push(ms); t += ms; }, sleeps };
}

/** A chainable Supabase query builder that records every call and resolves to `result`. */
function fakeDb(result: Record<string, unknown> = { data: [], error: null, count: 0 }) {
  const calls: [string, unknown[]][] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
      return (...args: unknown[]) => { calls.push([String(prop), args]); return builder; };
    },
  });
  return { db: { from: (t: string) => { calls.push(['from', [t]]); return builder; } }, calls };
}

// ── the embedder ─────────────────────────────────────────────────────────────────────────────────

test('one request carries many texts; the key is a Bearer header only; vectors are placed by index', async () => {
  const f = fakeFetch([ok()]);
  const embed = createMistralEmbedder(KEY, f.impl);
  const out = await embed(['a', 'b', 'c']);
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].url, EMBED_ENDPOINT);
  assert.ok(!f.sent[0].url.includes(KEY));
  assert.equal(f.sent[0].headers.authorization, `Bearer ${KEY}`);
  assert.deepEqual(f.sent[0].body, { model: EMBED_MODEL, input: ['a', 'b', 'c'] });
  assert.equal(out.length, 3);
  assert.equal(out[0][0], 0);
  assert.equal(out[2][0], 0.02);
  assert.equal(out[1].length, 1024);
});

test('a wrong dimension or count is an error, not a silent bad row', async () => {
  const short = fakeFetch([() => new Response(JSON.stringify({ data: [{ index: 0, embedding: [1, 2] }] }), { status: 200 })]);
  await assert.rejects(createMistralEmbedder(KEY, short.impl)(['a']), /dimension 2/);
  const few = fakeFetch([() => new Response(JSON.stringify({ data: [] }), { status: 200 })]);
  await assert.rejects(createMistralEmbedder(KEY, few.impl)(['a']), /0 embeddings for 1/);
});

test('a 429 becomes MistralEmbedError with Retry-After and a one-line summary that never holds the key', async () => {
  const f = fakeFetch([too('7')]);
  await assert.rejects(createMistralEmbedder(KEY, f.impl)(['x']), (e: unknown) => {
    assert.ok(e instanceof MistralEmbedError);
    assert.equal(e.isRateLimit, true);
    assert.equal(e.retryAfterMs, 7_000);
    assert.equal(e.summary, 'Rate limited by Mistral (429, retry in 7s): Requests rate limit exceeded');
    assert.ok(!e.summary.includes(KEY) && !e.detail.includes(KEY));
    return true;
  });
  assert.equal(retryAfterMs('1.5'), 1_500);
  assert.equal(retryAfterMs(new Date(10_000).toUTCString(), 4_000), 6_000);
  assert.equal(retryAfterMs(null), null);
});

test('readMistralKey fails clearly without echoing anything', () => {
  assert.throws(() => readMistralKey({}), /^Error: MISTRAL_API_KEY is not set\.$/);
  assert.equal(readMistralKey({ MISTRAL_API_KEY: ` ${KEY} ` }), KEY);
});

test('planBatches respects the text and token caps', () => {
  assert.deepEqual(planBatches(['a', 'b', 'c', 'd', 'e'], 1_000, 2), [[0, 1], [2, 3], [4]]);
  assert.deepEqual(planBatches(['x'.repeat(30), 'x'.repeat(30), 'x'.repeat(30)], 20, 64), [[0, 1], [2]]);
});

test('embedTexts paces requests under the per-minute limit', async () => {
  const time = fakeTime();
  const f = fakeFetch([ok()]);
  const out = await embedTexts(Array.from({ length: 10 }, (_, i) => `t${i}`), {
    apiKey: KEY, fetchImpl: f.impl, sleep: time.sleep, now: time.now, batchSize: 2, requestsPerMinute: 3,
  });
  assert.equal(out.length, 10);
  assert.equal(f.sent.length, 5);
  assert.ok(time.sleeps.length >= 1 && time.sleeps.every((ms) => ms <= 60_000), JSON.stringify(time.sleeps));
});

test('embedTexts retries a 429 after Retry-After and gives up after maxRetries', async () => {
  const time = fakeTime();
  const f = fakeFetch([too('3'), ok()]);
  const out = await embedTexts(['a'], { apiKey: KEY, fetchImpl: f.impl, sleep: time.sleep, now: time.now });
  assert.equal(out.length, 1);
  assert.deepEqual(time.sleeps, [3_000]);

  const always = fakeFetch([too('1')]);
  const t2 = fakeTime();
  await assert.rejects(
    embedTexts(['a'], { apiKey: KEY, fetchImpl: always.impl, sleep: t2.sleep, now: t2.now, maxRetries: 2 }),
    EmbedRateLimitError,
  );
  assert.equal(always.sent.length, 3);
});

test('embedTexts waits for the minute to turn when the server says none are left', async () => {
  const time = fakeTime();
  const f = fakeFetch([ok({ 'x-ratelimit-remaining-req-minute': '0' }), ok()]);
  await embedTexts(['a', 'b'], { apiKey: KEY, fetchImpl: f.impl, sleep: time.sleep, now: time.now, batchSize: 1 });
  assert.equal(f.sent.length, 2);
  assert.deepEqual(time.sleeps, [60_000]);
});

test('embedQuery retries a 429 at most twice (someone is waiting)', async () => {
  const time = fakeTime();
  const f = fakeFetch([too('1')]);
  await assert.rejects(embedQuery('q', { apiKey: KEY, fetchImpl: f.impl, sleep: time.sleep, now: time.now }), EmbedRateLimitError);
  assert.equal(f.sent.length, 3);
});

// ── writers write embedding_v2 ───────────────────────────────────────────────────────────────────

test('chunkText ends (the old copy looped forever on the last chunk) and covers the text with overlap', () => {
  assert.deepEqual(chunkText(''), []);
  assert.deepEqual(chunkText('short'), ['short']);
  const text = Array.from({ length: 4000 }, (_, i) => String.fromCharCode(97 + (i % 26))).join('');
  const chunks = chunkText(text);
  assert.equal(chunks.length, 3);
  assert.ok(chunks.every((c) => c.length <= CHUNK_SIZE));
  assert.equal(chunks[1].slice(0, CHUNK_OVERLAP), chunks[0].slice(-CHUNK_OVERLAP));
  assert.ok(chunks.at(-1)!.endsWith(text.slice(-50)));
  assert.equal(chunkText('x'.repeat(CHUNK_SIZE)).length, 1);
});

test('union chunk rows carry embedding_v2 (1024) and never the legacy embedding; one embed call', async () => {
  const calls: string[][] = [];
  const rows = await buildChunkRows('doc-1', ['one', 'two'], async (texts) => {
    calls.push(texts);
    return texts.map(() => vec());
  });
  assert.deepEqual(calls, [['one', 'two']]);
  assert.deepEqual(rows.map((r) => [r.document_id, r.chunk_index, r.chunk_text]), [['doc-1', 0, 'one'], ['doc-1', 1, 'two']]);
  for (const r of rows) {
    assert.ok(!('embedding' in r));
    assert.equal(JSON.parse(r.embedding_v2).length, 1024);
  }
  await assert.rejects(buildChunkRows('d', ['a', 'b'], async () => [vec()]), /Embedded 1 of 2/);
});

test('the help store writes and reads embedding_v2 only, always filtered to its app', async () => {
  const { db, calls } = fakeDb();
  const store = createHelpArticleStore(db, 'contractor');
  await store.upsert({ title: 'T', content: 'C', role: 'all' }, vec());
  const upsert = calls.find(([m]) => m === 'upsert')!;
  const row = upsert[1][0] as Record<string, unknown>;
  assert.equal(row.app, 'contractor');
  assert.ok(!('embedding' in row));
  assert.equal(JSON.parse(String(row.embedding_v2)).length, 1024);
  assert.deepEqual(upsert[1][1], { onConflict: 'title,app' });

  calls.length = 0;
  await store.listEmbedded();
  assert.deepEqual(calls.filter(([m]) => m === 'not' || m === 'eq').map(([m, a]) => [m, ...a]), [
    ['eq', 'app', 'contractor'],
    ['not', 'embedding_v2', 'is', null],
  ]);
  calls.length = 0;
  await store.deleteTitles(['gone']);
  assert.ok(calls.some(([m, a]) => m === 'eq' && a[0] === 'app' && a[1] === 'contractor'));
});

test('the union chunk store selects pending rows by embedding_v2 IS NULL and writes embedding_v2', async () => {
  const { db, calls } = fakeDb({
    data: [{ id: 'a1', chunk_text: 'text', chunk_index: 2, union_documents: { name: 'IATSE 317 contract' } }],
    error: null,
    count: 4,
  });
  const store = createUnionChunkStore(db);
  const page = await store.listPending(10, 'a0');
  assert.deepEqual(page, [{ id: 'a1', text: 'text', label: 'IATSE 317 contract, section 3' }]);
  assert.ok(calls.some(([m, a]) => m === 'is' && a[0] === 'embedding_v2' && a[1] === null));
  assert.ok(calls.some(([m, a]) => m === 'gt' && a[0] === 'id' && a[1] === 'a0'));
  const select = calls.find(([m]) => m === 'select')!;
  assert.doesNotMatch(String(select[1][0]), /embedding/); // never reads a vector back
  calls.length = 0;
  await store.saveV2('a1', vec());
  const update = calls.find(([m]) => m === 'update')!;
  assert.deepEqual(Object.keys(update[1][0] as object), ['embedding_v2']);
  assert.equal(await store.countPending(), 4);
});

// ── readers read the v2 functions and degrade gracefully ─────────────────────────────────────────

test('help retrieval calls match_help_articles_v2 with a 1024 vector and the app filter', async () => {
  const seen: [string, Record<string, unknown>][] = [];
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    seen.push([fn, args]);
    return { data: [{ id: '1', title: 'T', content: 'C', role: 'all', similarity: 0.9 }], error: null };
  };
  const r = await matchHelpArticles(rpc, vec(), { app: 'contractor', role: 'lister' });
  assert.equal(HELP_MATCH_FN, 'match_help_articles_v2');
  assert.equal(seen[0][0], 'match_help_articles_v2');
  assert.equal(JSON.parse(String(seen[0][1].query_embedding)).length, 1024);
  assert.equal(seen[0][1].app_filter, 'contractor');
  assert.equal(seen[0][1].role_filter, 'lister');
  assert.equal(r.matches.length, 1);
  assert.equal(r.degraded, undefined);
});

test('union retrieval calls match_union_chunks_v2 with the user id', async () => {
  const seen: [string, Record<string, unknown>][] = [];
  const rpc = async (fn: string, args: Record<string, unknown>) => { seen.push([fn, args]); return { data: [], error: null }; };
  const r = await matchUnionChunks(rpc, vec(), { userId: 'u1', unionLocal: '' });
  assert.equal(UNION_MATCH_FN, 'match_union_chunks_v2');
  assert.deepEqual([seen[0][0], seen[0][1].p_user_id, seen[0][1].union_filter, seen[0][1].match_count], ['match_union_chunks_v2', 'u1', null, 5]);
  assert.deepEqual(r, { matches: [] }); // nothing re-embedded yet: empty, not an error
});

test('retrieval degrades to empty when the function is missing, throws, or the vector is the wrong size', async () => {
  const missing = await matchHelpArticles(
    async () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.match_help_articles_v2' } }),
    vec(), { app: 'contractor' },
  );
  assert.deepEqual(missing.matches, []);
  assert.match(missing.degraded ?? '', /PGRST202/);
  const threw = await matchUnionChunks(async () => { throw new Error('socket closed'); }, vec(), { userId: 'u' });
  assert.deepEqual(threw.matches, []);
  assert.match(threw.degraded ?? '', /socket closed/);
  let called = false;
  const wrong = await matchHelpArticles(async () => { called = true; return { data: [], error: null }; }, [1, 2, 3], { app: 'contractor' });
  assert.equal(called, false);
  assert.match(wrong.degraded ?? '', /3 dimensions/);
});

// ── union re-embed engine ────────────────────────────────────────────────────────────────────────

function memoryUnionStore(n: number) {
  const rows = Array.from({ length: n }, (_, i): PendingChunk & { v2?: number[] } => ({
    id: `c${String(i).padStart(3, '0')}`, text: `chunk ${i}`, label: `Doc, section ${i + 1}`,
  }));
  const store: UnionChunkStore = {
    countAll: async () => rows.length,
    countPending: async () => rows.filter((r) => !r.v2).length,
    listPending: async (limit, afterId) =>
      rows.filter((r) => !r.v2 && (afterId === null || r.id > afterId)).slice(0, limit).map(({ id, text, label }) => ({ id, text, label })),
    saveV2: async (id, v) => { rows.find((r) => r.id === id)!.v2 = v; },
  };
  return { store, rows };
}

function clockPair(): Clock & { sleeps: number[] } {
  let t = 0;
  const sleeps: number[] = [];
  return { now: () => t, sleep: async (ms) => { sleeps.push(ms); t += ms; }, sleeps };
}

test('the union re-embed fills embedding_v2 for every pending row in batches', async () => {
  const clock = clockPair();
  const { store, rows } = memoryUnionStore(10);
  const batches: number[] = [];
  const r = await runUnionBackfillChunk({
    store, clock, pacer: new Pacer(2_000, clock), timeBudgetMs: 40_000, batchMaxTexts: 4,
    embed: async (texts) => { batches.push(texts.length); return texts.map(() => vec()); },
  });
  assert.deepEqual(batches, [4, 4, 2]);
  assert.equal(r.embedded, 10);
  assert.equal(r.total, 10);
  assert.equal(r.cursor, 10);
  assert.equal(r.done, true);
  assert.ok(rows.every((x) => x.v2?.length === 1024));
});

test('a failed union batch is reported once and passed over; the run still reaches the end', async () => {
  const clock = clockPair();
  const { store } = memoryUnionStore(6);
  let n = 0;
  const r = await runUnionBackfillChunk({
    store, clock, pacer: new Pacer(2_000, clock), timeBudgetMs: 40_000, batchMaxTexts: 2,
    embed: async (texts) => {
      if (n++ === 1) throw new MistralEmbedError(400, JSON.stringify({ message: 'bad' }));
      return texts.map(() => vec());
    },
  });
  assert.equal(r.done, true);
  assert.equal(r.embedded, 4);
  assert.deepEqual(r.failed.map((f) => f.title), ['Doc, section 3', 'Doc, section 4']);
  assert.equal(r.cursor, 4);
});

test('a union 429 that does not fit the chunk returns waitMs for the browser loop', async () => {
  const clock = clockPair();
  const { store } = memoryUnionStore(3);
  const r = await runUnionBackfillChunk({
    store, clock, pacer: new Pacer(2_000, clock), timeBudgetMs: 10_000,
    embed: async () => { throw new MistralEmbedError(429, '{}', 30_000); },
  });
  assert.equal(r.done, false);
  assert.equal(r.stoppedReason, 'rate_limit');
  assert.equal(r.waitMs, 30_000);
  assert.equal(r.cursor, 0);
});

// ── migrations and call sites ────────────────────────────────────────────────────────────────────

test('migration 226 is additive, safe to run twice, and creates the v2 columns, indexes and functions', () => {
  const sql = read('supabase/migrations/226_mistral_embeddings_v2.sql');
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  for (const t of ['help_articles', 'union_document_chunks']) {
    assert.match(code, new RegExp(`ALTER TABLE public\\.${t}\\s+ADD COLUMN IF NOT EXISTS embedding_v2 vector\\(1024\\)`));
  }
  assert.equal((code.match(/CREATE INDEX IF NOT EXISTS idx_\w+_embedding_v2\s+ON public\.\w+ USING hnsw \(embedding_v2 vector_cosine_ops\)/g) ?? []).length, 2);
  assert.match(code, /CREATE OR REPLACE FUNCTION public\.match_help_articles_v2\(\s*query_embedding vector\(1024\)/);
  assert.match(code, /CREATE OR REPLACE FUNCTION public\.match_union_chunks_v2\(\s*query_embedding vector\(1024\)/);
  // Nothing CentenarianOS reads is dropped or redefined.
  assert.doesNotMatch(code, /\bDROP\b/i);
  assert.doesNotMatch(code, /FUNCTION public\.match_help_articles\(|FUNCTION public\.match_union_chunks\(/);
  assert.doesNotMatch(code, /ALTER COLUMN|RENAME/i);
  assert.match(code, /REVOKE ALL ON FUNCTION public\.match_union_chunks_v2\(vector, INT, TEXT, UUID\) FROM PUBLIC, anon, authenticated/);
});

test('Neon migration 0003 adds the same columns, indexes and functions', () => {
  const sql = read('db/migrations/0003_mistral_embedding_v2.sql');
  assert.match(sql, /ALTER TABLE "help_articles" ADD COLUMN "embedding_v2" vector\(1024\)/);
  assert.match(sql, /ALTER TABLE "union_document_chunks" ADD COLUMN "embedding_v2" vector\(1024\)/);
  assert.match(sql, /CREATE INDEX "idx_help_articles_embedding_v2" ON "help_articles" USING hnsw/);
  assert.match(sql, /CREATE INDEX "idx_union_chunks_embedding_v2" ON "union_document_chunks" USING hnsw/);
  assert.match(sql, /FUNCTION public\.match_help_articles_v2\(query_embedding vector\(1024\)/);
  assert.match(sql, /FUNCTION public\.match_union_chunks_v2\(query_embedding vector\(1024\)/);
});

test('no app code still embeds with Gemini or searches the 768 functions', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(join(root, dir))) {
      const p = join(dir, name);
      if (statSync(join(root, p)).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) files.push(p);
    }
  };
  for (const d of ['app', 'lib', 'components', 'scripts']) walk(d);
  const bad = files.filter((f) => {
    const s = read(f);
    return /['"`]gemini-embedding-001['"`]|:embedContent|rpc\('match_help_articles'|rpc\('match_union_chunks'|\bembedding: `\[/.test(s);
  });
  assert.deepEqual(bad, []);
});
