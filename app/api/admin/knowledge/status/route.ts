// app/api/admin/knowledge/status/route.ts
// GET: Returns the last knowledge sync timestamp from platform_settings.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await db
    .from('platform_settings')
    .select('value')
    .eq('key', 'knowledge_last_synced_at')
    .maybeSingle();

  return NextResponse.json({ lastSyncedAt: data?.value ?? null });
}
