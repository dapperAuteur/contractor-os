// scripts/seed-help-articles.ts
// Embeds the contractor help articles into the shared help_articles table from a laptop: the same
// engine as /admin/sync and the cron (lib/help/embed-sync.ts), with mistral-embed (1024) written to
// `embedding_v2`. Use /admin/sync when the site is up; this is the fallback in
// docs/05-operations.md section 9.
//
// Usage:
//   npx tsx scripts/seed-help-articles.ts            changed or un-embedded articles only
//   npx tsx scripts/seed-help-articles.ts --force    every article
//
// Requirements (in .env.local, never pasted on the command line):
//   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
//   - MISTRAL_API_KEY
//   - Migration 226_mistral_embeddings_v2.sql applied to the database
//
// Safe to re-run: upserts on (title, app); only app = 'contractor' rows are read, written or deleted.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { HELP_ARTICLES } from '../lib/help/articles';
import { createMistralEmbedder, EMBED_SYNC_MIN_INTERVAL_MS, readMistralKey } from '../lib/ai/mistral-embed';
import { Pacer, realClock, runHelpSyncUntilDone } from '../lib/help/embed-sync';
import { createHelpArticleStore } from '../lib/help/supabase-store';

const APP = 'contractor';
// The same role set as lib/admin/syncKnowledge.ts contractorArticles(): the sync deletes rows whose
// title is not in this list, so the two must match.
const ROLES = ['contractor', 'lister', 'all', 'admin'];

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  const force = process.argv.includes('--force');
  const articles = HELP_ARTICLES.filter((a) => ROLES.includes(a.role));
  console.log(`Embedding ${articles.length} articles for app="${APP}"${force ? ' (force)' : ''}...`);

  const totals = await runHelpSyncUntilDone({
    articles,
    store: createHelpArticleStore(createClient(supabaseUrl, serviceRoleKey), APP),
    embed: createMistralEmbedder(readMistralKey()),
    pacer: new Pacer(EMBED_SYNC_MIN_INTERVAL_MS, realClock),
    force,
    totalBudgetMs: 10 * 60_000,
  });

  for (const f of totals.failed) console.error(`  failed: "${f.title}": ${f.message}`);
  console.log(
    `\n${totals.done ? 'Done' : 'Stopped'}. Embedded: ${totals.embedded}, unchanged: ${totals.skipped}, ` +
      `removed: ${totals.removed}, failed: ${totals.failed.length}${totals.error ? `. ${totals.error}` : ''}`,
  );
  if (!totals.done || totals.failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
