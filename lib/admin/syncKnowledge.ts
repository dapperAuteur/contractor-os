// lib/admin/syncKnowledge.ts
// Wires the help-article embedding sync (lib/help/embed-sync.ts) to Supabase and the Gemini key,
// and keeps the knowledge timestamp in platform_settings.
// Course (lesson) embeddings were dropped in plan 18 Phase 1: the Academy left Work.WitUS, and the
// job re-embedded every published CYOA course in the shared database, CentenarianOS's included.
// CentenarianOS runs its own sync for its courses.
//
// Called by: the 3:00 UTC cron (/api/cron/knowledge-sync) and the /admin/sync buttons
// (/api/admin/knowledge/refresh, /api/admin/help/ingest), one chunk per request.
// The demo reset no longer starts a sync of its own: its fire-and-forget copy ran alongside the
// buttons and the cron and spent the same per-minute quota (the 429s of 2026-11-04).

import { createClient } from '@supabase/supabase-js';
import { HELP_ARTICLES } from '@/lib/help/articles';
import { createGeminiEmbedder, HELP_SYNC_MIN_INTERVAL_MS } from '@/lib/ai/gemini-embed';
import {
  Pacer,
  realClock,
  runHelpSyncChunk,
  runHelpSyncUntilDone,
  type ChunkResult,
  type HelpArticleStore,
  type RunTotals,
  type SyncArticle,
} from '@/lib/help/embed-sync';

const APP = 'contractor';

/**
 * Time one chunk may spend starting embeds. The chunk routes declare `maxDuration = 60`, the
 * lowest ceiling of any Vercel plan, and this leaves 20 seconds for the database reads, the stale
 * delete and one in-flight request. At one request a second that is about 40 articles a chunk.
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

function supabaseHelpStore(): HelpArticleStore {
  const db = getDb();
  return {
    async listEmbedded() {
      const { data, error } = await db
        .from('help_articles')
        .select('title, content, role')
        .eq('app', APP)
        .not('embedding', 'is', null);
      if (error) throw new Error(`help_articles read failed: ${error.message}`);
      return (data ?? []) as SyncArticle[];
    },
    async listTitles() {
      const { data, error } = await db.from('help_articles').select('title').eq('app', APP);
      if (error) throw new Error(`help_articles read failed: ${error.message}`);
      return (data ?? []).map((r: { title: string }) => r.title);
    },
    async upsert(article, embedding) {
      // pgvector takes the vector as a bracketed string, "[0.1,0.2,...]".
      const { error } = await db.from('help_articles').upsert(
        {
          title: article.title,
          content: article.content,
          role: article.role,
          app: APP,
          embedding: `[${embedding.join(',')}]`,
        },
        { onConflict: 'title,app' },
      );
      if (error) throw new Error(`help_articles write failed: ${error.message}`);
    },
    async deleteTitles(titles) {
      const { error } = await db.from('help_articles').delete().eq('app', APP).in('title', titles);
      if (error) throw new Error(`help_articles delete failed: ${error.message}`);
    },
  };
}

// One pacer per server instance, shared by every route below.
const pacer = new Pacer(HELP_SYNC_MIN_INTERVAL_MS, realClock);

function embedder() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY_WORK_WITUS;
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY_WORK_WITUS is not set.');
  return createGeminiEmbedder(apiKey);
}

/** One chunk, for the admin buttons. The browser loops on `cursor` until `done`. */
export async function runHelpSyncChunkForApp(opts: { cursor: number; force: boolean }): Promise<ChunkResult> {
  return runHelpSyncChunk({
    articles: contractorArticles(),
    store: supabaseHelpStore(),
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
    store: supabaseHelpStore(),
    embed: embedder(),
    pacer,
    totalBudgetMs,
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
