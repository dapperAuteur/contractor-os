// lib/admin/syncKnowledge.ts
// Wires the help-article embedding sync (lib/help/embed-sync.ts) and the union re-embed
// (lib/union/embed-backfill.ts) to Supabase and the Mistral key, and keeps the knowledge timestamp
// in platform_settings. Embeddings are mistral-embed (1024) in the `embedding_v2` columns
// (lib/ai/mistral-embed.ts, migration 226); Gemini is no longer used for embeddings.
// Course (lesson) embeddings were dropped in plan 18 Phase 1: the Academy left Work.WitUS, and the
// job re-embedded every published CYOA course in the shared database, CentenarianOS's included.
// CentenarianOS runs its own sync for its courses.
//
// Called by: the 3:00 UTC cron (/api/cron/knowledge-sync) and the /admin/sync buttons
// (/api/admin/knowledge/refresh, /api/admin/help/ingest, /api/admin/union/reembed), one chunk per
// request. The demo reset does not start a sync of its own.

import { createClient } from '@supabase/supabase-js';
import { HELP_ARTICLES } from '@/lib/help/articles';
import { createMistralEmbedder, EMBED_SYNC_MIN_INTERVAL_MS, readMistralKey } from '@/lib/ai/mistral-embed';
import {
  Pacer,
  realClock,
  runHelpSyncChunk,
  runHelpSyncUntilDone,
  type ChunkResult,
  type RunTotals,
  type SyncArticle,
} from '@/lib/help/embed-sync';
import { createHelpArticleStore } from '@/lib/help/supabase-store';
import { runUnionBackfillChunk } from '@/lib/union/embed-backfill';
import { createUnionChunkStore } from '@/lib/union/supabase-chunk-store';

const APP = 'contractor';

/**
 * Time one chunk may spend starting embeds. The chunk routes declare `maxDuration = 60`, the
 * lowest ceiling of any Vercel plan, and this leaves 20 seconds for the database reads and writes,
 * the stale delete and one in-flight request. With batching, the whole help sync fits one chunk.
 */
export const HELP_SYNC_CHUNK_BUDGET_MS = 40_000;

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** The articles this app owns. Never touches CentenarianOS's rows (app = 'centenarian'). */
export function contractorArticles(): SyncArticle[] {
  return HELP_ARTICLES.filter((a) => ['contractor', 'lister', 'all', 'admin'].includes(a.role));
}

// One pacer per server instance, shared by every route below, so two buttons pressed in one warm
// instance still share one budget.
const pacer = new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, realClock);

function embedder() {
  return createMistralEmbedder(readMistralKey());
}

/** One chunk, for the admin buttons. The browser loops on `cursor` until `done`. */
export async function runHelpSyncChunkForApp(opts: { cursor: number; force: boolean }): Promise<ChunkResult> {
  return runHelpSyncChunk({
    articles: contractorArticles(),
    store: createHelpArticleStore(getDb(), APP),
    embed: embedder(),
    pacer,
    cursor: opts.cursor,
    force: opts.force,
    timeBudgetMs: HELP_SYNC_CHUNK_BUDGET_MS,
  });
}

/** Whole run inside one invocation, for the cron. */
export async function runHelpSyncForCron(totalBudgetMs: number): Promise<RunTotals> {
  return runHelpSyncUntilDone({
    articles: contractorArticles(),
    store: createHelpArticleStore(getDb(), APP),
    embed: embedder(),
    pacer,
    totalBudgetMs,
  });
}

/** One chunk of the union re-embed (rows with no embedding_v2), for the admin button. */
export async function runUnionReembedChunk(): Promise<ChunkResult> {
  return runUnionBackfillChunk({
    store: createUnionChunkStore(getDb()),
    embed: embedder(),
    pacer,
    timeBudgetMs: HELP_SYNC_CHUNK_BUDGET_MS,
  });
}

/** Update the knowledge sync timestamp in platform_settings. */
export async function updateContextTimestamp(): Promise<string> {
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .from('platform_settings')
    .upsert({ key: 'knowledge_last_synced_at', value: now }, { onConflict: 'key' });

  return now;
}
