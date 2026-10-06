// app/api/admin/unread/route.ts
// Returns unread counts for admin sidebar badges:
// - feedback: user_feedback rows with is_read_by_admin = false
// - messages: message_replies from users (is_admin=false) not yet read

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = getDb();
  const [{ count: feedbackCount }, { count: messagesCount }, { count: logsCount }] = await Promise.all([
    db.from('user_feedback').select('*', { count: 'exact', head: true }).eq('is_read_by_admin', false),
    db.from('message_replies').select('*', { count: 'exact', head: true }).eq('is_admin', false).eq('is_read_by_admin', false),
    db.from('app_logs').select('*', { count: 'exact', head: true }).eq('is_reviewed', false).in('level', ['warn', 'error']),
  ]);

  return NextResponse.json({
    feedback: feedbackCount ?? 0,
    messages: messagesCount ?? 0,
    logs: logsCount ?? 0,
  });
}
