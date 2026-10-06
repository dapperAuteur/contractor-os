// app/api/admin/notifications/route.ts
// Admin-only: list notifications + mark all as read

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';

function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/admin/notifications?unread=true&type=new_exercise&limit=50
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const unreadOnly = sp.get('unread') === 'true';
  const type = sp.get('type');
  const limit = Math.min(parseInt(sp.get('limit') || '100', 10), 200);

  const db = getServiceDb();
  let query = db
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.eq('is_read', false).eq('promoted', false);
  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return unread count too (for badge)
  const { count } = await db
    .from('admin_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
    .eq('promoted', false);

  return NextResponse.json({ notifications: data || [], unread: count ?? 0 });
}

// PATCH /api/admin/notifications — mark all as read
export async function PATCH() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = getServiceDb();
  const { error } = await db
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('is_read', false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
