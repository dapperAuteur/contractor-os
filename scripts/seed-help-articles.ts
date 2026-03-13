// scripts/seed-help-articles.ts
// Seeds contractor help articles into the shared help_articles pgvector table.
//
// Usage:
//   npx tsx scripts/seed-help-articles.ts
//
// Requirements:
//   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
//   - GOOGLE_GEMINI_API_KEY_WORK_WITUS in .env.local
//   - Migration 130_help_articles_app_column.sql applied to the database
//
// Safe to re-run: upserts on (title, app) so existing rows are updated.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { HELP_ARTICLES, HelpArticle } from '../lib/help/articles';

const APP = 'contractor';
const EMBEDDING_MODEL = 'gemini-embedding-001';
const BATCH_DELAY_MS = 200; // avoid rate-limit on Gemini embedding API

// Roles to include for the contractor app
const INCLUDED_ROLES: HelpArticle['role'][] = ['contractor', 'lister', 'all'];

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY_WORK_WITUS;
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY_WORK_WITUS not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding API error (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.embedding?.values ?? [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const db = createClient(supabaseUrl, serviceRoleKey);

  const toSeed = HELP_ARTICLES.filter((a) => INCLUDED_ROLES.includes(a.role));
  console.log(`Seeding ${toSeed.length} articles for app="${APP}"...`);

  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < toSeed.length; i++) {
    const article = toSeed[i];
    const label = `[${i + 1}/${toSeed.length}] "${article.title}"`;

    try {
      // Embed title + content together for richer semantic match
      const text = `${article.title}\n\n${article.content}`;
      const embedding = await getEmbedding(text);

      const { error } = await db
        .from('help_articles')
        .upsert(
          {
            title: article.title,
            content: article.content,
            role: article.role,
            app: APP,
            embedding: `[${embedding.join(',')}]`,
          },
          { onConflict: 'title,app' },
        );

      if (error) {
        console.error(`  ✗ ${label} — DB error: ${error.message}`);
        failed++;
      } else {
        console.log(`  ✓ ${label}`);
        inserted++;
      }
    } catch (err) {
      console.error(`  ✗ ${label} — ${err instanceof Error ? err.message : err}`);
      failed++;
    }

    // Rate-limit buffer between embedding calls
    if (i < toSeed.length - 1) await sleep(BATCH_DELAY_MS);
  }

  console.log(`\nDone. Seeded: ${inserted}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
