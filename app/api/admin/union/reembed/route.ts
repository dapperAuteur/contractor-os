// app/api/admin/union/reembed/route.ts
// POST: admin-only. Re-embeds union_document_chunks rows that have no `embedding_v2` yet (the rows
// written with Gemini before the move to mistral-embed), one chunk of work per request. The
// /admin/sync page loops until `done`. The engine is lib/union/embed-backfill.ts; pacing and 429
// retries are shared with the help sync (lib/help/embed-sync.ts). The body is ignored: there is no
// cursor to send, the work list is "rows still NULL".
// GET: { total, embeddedV2 } over every chunk row (the runbook check is embeddedV2 === total).

import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';
import { runUnionReembedChunk } from '@/lib/admin/syncKnowledge';

// One chunk spends at most HELP_SYNC_CHUNK_BUDGET_MS (40 s); 60 is the lowest ceiling on any plan.
export const maxDuration = 60;

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!process.env.MISTRAL_API_KEY?.trim()) {
    return NextResponse.json({ error: 'MISTRAL_API_KEY is not set in environment variables.' }, { status: 500 });
  }
  try {
    return NextResponse.json(await runUnionReembedChunk());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const all = await db.from('union_document_chunks').select('id', { count: 'exact', head: true });
  const done = await db
    .from('union_document_chunks')
    .select('id', { count: 'exact', head: true })
    .not('embedding_v2', 'is', null);
  return NextResponse.json({
    total: all.count ?? 0,
    embeddedV2: done.count ?? 0,
    // Set when migration 226 has not been applied (the column does not exist yet).
    error: done.error?.message,
  });
}
