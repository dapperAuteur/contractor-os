// app/api/admin/help/ingest/route.ts
// POST: admin-only. Re-embeds EVERY help article (changed or not) into help_articles, one chunk per
// request. Body: { cursor?: number, force?: boolean (default true) }. The /admin/sync page loops on
// the returned `cursor` until `done`. Pacing, 429 retries and the stale-row cleanup live in
// lib/help/embed-sync.ts. Rows are upserted in place, never wiped first, so a failed article keeps
// its previous embedding. Embeddings are mistral-embed (1024) in help_articles.embedding_v2.
// GET: row counts for this app: rows, and rows with a v2 (Mistral) embedding. The runbook's check
// after the move (docs/05-operations.md section 9) is `embeddedV2 === total`.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';
import { contractorArticles, runHelpSyncChunkForApp } from '@/lib/admin/syncKnowledge';
import { readSyncBody } from '@/lib/help/sync-request';

// One chunk spends at most HELP_SYNC_CHUNK_BUDGET_MS (40 s); 60 is the lowest ceiling on any plan.
export const maxDuration = 60;

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!process.env.MISTRAL_API_KEY?.trim()) {
    return NextResponse.json(
      { error: 'MISTRAL_API_KEY is not set in environment variables.' },
      { status: 500 },
    );
  }

  const { cursor, force } = await readSyncBody(req);
  try {
    const result = await runHelpSyncChunkForApp({ cursor, force: force ?? true });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = getDb();
  const rows = await db
    .from('help_articles')
    .select('id', { count: 'exact', head: true })
    .eq('app', 'contractor');
  const embedded = await db
    .from('help_articles')
    .select('id', { count: 'exact', head: true })
    .eq('app', 'contractor')
    .not('embedding_v2', 'is', null);

  return NextResponse.json({
    count: rows.count ?? 0,
    embeddedV2: embedded.count ?? 0,
    // Set when migration 226 has not been applied (the column does not exist yet).
    error: embedded.error?.message,
    total: contractorArticles().length,
  });
}
