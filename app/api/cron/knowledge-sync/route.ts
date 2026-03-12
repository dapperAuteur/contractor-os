// app/api/cron/knowledge-sync/route.ts
// Daily cron to re-sync help articles, course embeddings, and knowledge timestamp.
// Also callable manually by admin via POST.

import { NextRequest, NextResponse } from 'next/server';
import { syncAllKnowledge } from '@/lib/admin/syncKnowledge';

function guard(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!guard(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncAllKnowledge();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
