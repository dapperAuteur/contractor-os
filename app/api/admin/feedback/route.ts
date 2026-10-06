// app/api/admin/feedback/route.ts
// Admin-only: returns all user feedback submissions.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = getServiceClient();

  // user_feedback.user_id → auth.users.id (not profiles.id directly), so
  // PostgREST embedded join won't traverse it — fetch profiles separately.
  const { data, error } = await db
    .from('user_feedback')
    .select('id, category, message, media_url, is_read_by_admin, created_at, user_id, app')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[admin/feedback] Fetch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = data ?? [];
  const userIds = [...new Set(items.map((i) => i.user_id).filter(Boolean))];

  // Profiles: username / display_name (profiles.id === auth.users.id)
  const { data: profileRows } = userIds.length > 0
    ? await db.from('profiles').select('id, username, display_name').in('id', userIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p]));

  // Emails from auth admin API
  const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = Object.fromEntries(users.map((u) => [u.id, u.email ?? null]));

  const enriched = items.map((item) => ({
    ...item,
    email: emailMap[item.user_id] ?? null,
    profiles: profileMap[item.user_id] ?? null,
  }));

  return NextResponse.json(enriched);
}
