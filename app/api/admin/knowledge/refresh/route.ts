// app/api/admin/knowledge/refresh/route.ts
// POST: Admin-only on-demand trigger to re-sync help articles + course embeddings.

import { NextResponse } from 'next/server';
import { syncAllKnowledge } from '@/lib/admin/syncKnowledge';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const result = await syncAllKnowledge();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
