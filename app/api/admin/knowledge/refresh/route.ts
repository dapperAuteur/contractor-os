// app/api/admin/knowledge/refresh/route.ts
// POST: admin-only. Embeds the help articles that changed since the last sync, one chunk per
// request. Body: { cursor?: number }. The /admin/sync page calls again with the returned `cursor`
// (after waiting `waitMs` when Google asked for a pause) until `done`; the last chunk also updates
// the knowledge timestamp. See lib/help/embed-sync.ts for the pacing and retry rules.

import { NextRequest, NextResponse } from 'next/server';
import { runHelpSyncChunkForApp, updateContextTimestamp } from '@/lib/admin/syncKnowledge';
import { requireAdmin } from '@/lib/auth/require-admin';
import { readSyncBody } from '@/lib/help/sync-request';

// One chunk spends at most HELP_SYNC_CHUNK_BUDGET_MS (40 s); 60 is the lowest ceiling on any plan.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { cursor } = await readSyncBody(request);
  try {
    const result = await runHelpSyncChunkForApp({ cursor, force: false });
    const timestamp = result.done ? await updateContextTimestamp() : undefined;
    return NextResponse.json({ ...result, timestamp });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
