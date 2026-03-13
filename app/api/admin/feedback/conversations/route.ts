// app/api/admin/feedback/conversations/route.ts
// GET: all user feedback grouped into per-user conversation threads.
// Each conversation contains user_feedback submissions + feedback_replies
// interleaved and sorted chronologically. Admin-only.

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getAdminUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => { try { cookieStore.set({ name, value, ...options }); } catch {} },
        remove: (name: string, options: CookieOptions) => { try { cookieStore.set({ name, value: '', ...options }); } catch {} },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin || admin.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();

  const [{ data: feedbackItems }, { data: allReplies }] = await Promise.all([
    db.from('user_feedback')
      .select('id, user_id, category, message, media_url, is_read_by_admin, created_at, app')
      .order('created_at', { ascending: true }),
    db.from('feedback_replies')
      .select('id, feedback_id, sender_id, is_admin, body, media_url, created_at')
      .order('created_at', { ascending: true }),
  ]);

  const items = feedbackItems ?? [];
  const replies = allReplies ?? [];

  if (items.length === 0) return NextResponse.json([]);

  // Build lookup: feedback_id → user_id
  const feedbackOwner: Record<string, string> = {};
  for (const item of items) feedbackOwner[item.id] = item.user_id;

  const userIds = [...new Set(items.map((i) => i.user_id).filter(Boolean))];

  const [{ data: profileRows }, { data: { users: authUsers } }] = await Promise.all([
    userIds.length > 0
      ? db.from('profiles').select('id, username, display_name').in('id', userIds)
      : Promise.resolve({ data: [] }),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profileMap = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p]));
  const emailMap = Object.fromEntries((authUsers ?? []).map((u) => [u.id, u.email ?? null]));

  // Group per user
  const conversationMap: Record<string, {
    user_id: string;
    messages: Array<{
      id: string; type: 'submission' | 'reply'; is_admin: boolean;
      body: string; category?: string; media_url?: string | null;
      created_at: string; app?: string | null; feedback_id: string;
    }>;
    unread_count: number;
    apps: Set<string>;
    latest_feedback_id: string;
    last_activity: string;
  }> = {};

  for (const item of items) {
    const uid = item.user_id;
    if (!conversationMap[uid]) {
      conversationMap[uid] = {
        user_id: uid,
        messages: [],
        unread_count: 0,
        apps: new Set(),
        latest_feedback_id: item.id,
        last_activity: item.created_at,
      };
    }
    const conv = conversationMap[uid];
    conv.messages.push({
      id: item.id, type: 'submission', is_admin: false,
      body: item.message, category: item.category,
      media_url: item.media_url, created_at: item.created_at,
      app: item.app ?? null, feedback_id: item.id,
    });
    if (!item.is_read_by_admin) conv.unread_count++;
    if (item.app) conv.apps.add(item.app);
    conv.latest_feedback_id = item.id; // last submission wins
    if (item.created_at > conv.last_activity) conv.last_activity = item.created_at;
  }

  for (const reply of replies) {
    const uid = feedbackOwner[reply.feedback_id];
    if (!uid || !conversationMap[uid]) continue;
    const conv = conversationMap[uid];
    conv.messages.push({
      id: reply.id, type: 'reply', is_admin: reply.is_admin,
      body: reply.body, media_url: reply.media_url,
      created_at: reply.created_at, feedback_id: reply.feedback_id,
    });
    if (reply.created_at > conv.last_activity) conv.last_activity = reply.created_at;
  }

  // Sort messages within each conversation, then sort conversations by last_activity desc
  const conversations = Object.values(conversationMap)
    .map((conv) => ({
      ...conv,
      apps: [...conv.apps],
      messages: conv.messages.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      username: profileMap[conv.user_id]?.username ?? null,
      display_name: profileMap[conv.user_id]?.display_name ?? null,
      email: emailMap[conv.user_id] ?? null,
    }))
    .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());

  return NextResponse.json(conversations);
}
