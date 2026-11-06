// File: lib/help/supabase-store.ts
// The HelpArticleStore (lib/help/embed-sync.ts) on the shared Supabase `help_articles` table.
// Takes the client as an argument and imports nothing from `@/`, so tests can hand it a fake.
//
// Columns: Work.WitUS writes and reads only `embedding_v2` (vector(1024), mistral-embed, migration
// 226). The legacy `embedding` (vector(768), Gemini) is left alone: CentenarianOS still writes and
// reads it for its own rows (app = 'centenarian'), and it is dropped only in a later cleanup.
// Every query is filtered to this app, so CentenarianOS's rows are never read, changed or deleted.

import { toPgVector } from '../ai/mistral-embed.ts';
import type { HelpArticleStore, SyncArticle } from './embed-sync.ts';

export const HELP_EMBEDDING_COLUMN = 'embedding_v2';

/** The slice of the Supabase client this store uses (structural, so a fake can stand in). */
export interface HelpDb {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
}

export function createHelpArticleStore(db: HelpDb, app: string): HelpArticleStore {
  return {
    async listEmbedded() {
      const { data, error } = await db
        .from('help_articles')
        .select('title, content, role')
        .eq('app', app)
        .not(HELP_EMBEDDING_COLUMN, 'is', null);
      if (error) throw new Error(`help_articles read failed: ${error.message}`);
      return (data ?? []) as SyncArticle[];
    },
    async listTitles() {
      const { data, error } = await db.from('help_articles').select('title').eq('app', app);
      if (error) throw new Error(`help_articles read failed: ${error.message}`);
      return ((data ?? []) as { title: string }[]).map((r) => r.title);
    },
    async upsert(article, embedding) {
      const { error } = await db.from('help_articles').upsert(
        {
          title: article.title,
          content: article.content,
          role: article.role,
          app,
          [HELP_EMBEDDING_COLUMN]: toPgVector(embedding),
        },
        { onConflict: 'title,app' },
      );
      if (error) throw new Error(`help_articles write failed: ${error.message}`);
    },
    async deleteTitles(titles) {
      const { error } = await db.from('help_articles').delete().eq('app', app).in('title', titles);
      if (error) throw new Error(`help_articles delete failed: ${error.message}`);
    },
  };
}
