// app/api/admin/help/ingest/route.ts
// POST: admin-only. Re-embeds EVERY help article (changed or not) into help_articles, one chunk per
// request. Body: { cursor?: number, force?: boolean (default true) }. The /admin/sync page loops on
// the returned `cursor` until `done`. Pacing, 429 retries and the stale-row cleanup live in
// lib/help/embed-sync.ts. Rows are upserted in place, never wiped first, so a failed article keeps
// its previous embedding.
// GET: row count, or ?diagnose=1 to list the models this key can use.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { HELP_ARTICLES } from '@/lib/help/articles';
import { requireAdmin } from '@/lib/auth/require-admin';
import { runHelpSyncChunkForApp } from '@/lib/admin/syncKnowledge';
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

  if (!process.env.GOOGLE_GEMINI_API_KEY_WORK_WITUS) {
    return NextResponse.json(
      { error: 'GOOGLE_GEMINI_API_KEY_WORK_WITUS is not set in environment variables.' },
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

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // ?diagnose=1 → list models available to this API key
  const diagnose = new URL(req.url).searchParams.get('diagnose');
  if (diagnose) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY_WORK_WITUS;
    if (!apiKey) return NextResponse.json({ error: 'GOOGLE_GEMINI_API_KEY_WORK_WITUS not set' }, { status: 500 });
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models',
      { headers: { 'x-goog-api-key': apiKey } },
    );
    const data = await r.json();
    // Extract just the names and supported methods for embedding
    const models = (data.models ?? []).map((m: { name: string; supportedGenerationMethods?: string[] }) => ({
      name: m.name,
      supportsEmbed: (m.supportedGenerationMethods ?? []).includes('embedContent'),
      supportsGenerate: (m.supportedGenerationMethods ?? []).includes('generateContent'),
    }));
    return NextResponse.json({ models, raw: r.ok ? undefined : data });
  }

  const db = getDb();
  const { count } = await db
    .from('help_articles')
    .select('id', { count: 'exact', head: true });

  return NextResponse.json({ count: count ?? 0, total: HELP_ARTICLES.length });
}
