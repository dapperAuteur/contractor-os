// lib/admin/syncKnowledge.ts
// Shared logic for syncing help articles and the context timestamp.
// Course (lesson) embeddings were dropped in plan 18 Phase 1: the Academy left Work.WitUS, and the
// job re-embedded every published CYOA course in the shared database, CentenarianOS's included.
// CentenarianOS runs its own sync for its courses.
// Called by: daily cron (/api/admin/demo/reset) and on-demand (/api/admin/knowledge/refresh).

import { createClient } from '@supabase/supabase-js';
import { HELP_ARTICLES } from '@/lib/help/articles';

const EMBEDDING_MODEL = 'gemini-embedding-001';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY_WORK_WITUS;
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY_WORK_WITUS not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini embedding error: ${err}`);
  }

  const data = await response.json();
  return data.embedding?.values ?? [];
}

export interface SyncResult {
  helpArticles: { succeeded: number; failed: number };
  timestamp: string;
}

/** Re-embed all help articles into help_articles table. */
export async function syncHelpArticles(): Promise<{ succeeded: number; failed: number }> {
  const db = getDb();

  // Only touch contractor-app articles — never wipe centenarian articles
  await db.from('help_articles').delete().eq('app', 'contractor');

  const contractorArticles = HELP_ARTICLES.filter((a) =>
    ['contractor', 'lister', 'all', 'admin'].includes(a.role),
  );

  let succeeded = 0;
  let failed = 0;

  for (const article of contractorArticles) {
    const text = `${article.title}\n\n${article.content}`;
    try {
      const embedding = await getEmbedding(text);
      if (!embedding.length) throw new Error('Empty embedding');

      const { error } = await db.from('help_articles').upsert(
        {
          title: article.title,
          content: article.content,
          role: article.role,
          app: 'contractor',
          embedding: `[${embedding.join(',')}]`,
        },
        { onConflict: 'title,app' },
      );
      if (error) throw new Error(error.message);
      succeeded++;
    } catch {
      failed++;
    }
    // Stay under Gemini free-tier limit (100 req/min)
    await new Promise((r) => setTimeout(r, 700));
  }

  return { succeeded, failed };
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

/** Run all sync tasks. Returns combined results. */
export async function syncAllKnowledge(): Promise<SyncResult> {
  const [helpResult] = await Promise.allSettled([
    syncHelpArticles(),
  ]);

  const helpArticles = helpResult.status === 'fulfilled'
    ? helpResult.value
    : { succeeded: 0, failed: HELP_ARTICLES.length };

  const timestamp = await updateContextTimestamp();

  return { helpArticles, timestamp };
}
