// app/api/feedback/conversation/route.ts
// GET: returns the current user's full conversation thread —
// all their feedback submissions + all replies, sorted chronologically.

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // All feedback from this user
  const { data: feedbackItems, error: feedbackErr } = await db
    .from('user_feedback')
    .select('id, category, message, media_url, created_at, app')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (feedbackErr) return NextResponse.json({ error: feedbackErr.message }, { status: 500 });

  const items = feedbackItems ?? [];
  const feedbackIds = items.map((i) => i.id);

  // All replies to those submissions
  const { data: replies } = feedbackIds.length > 0
    ? await db
        .from('feedback_replies')
        .select('id, feedback_id, is_admin, body, media_url, created_at')
        .in('feedback_id', feedbackIds)
        .order('created_at', { ascending: true })
    : { data: [] };

  // Build combined, sorted message list
  const messages = [
    ...items.map((item) => ({
      id: item.id,
      type: 'submission' as const,
      is_admin: false,
      body: item.message,
      category: item.category as string,
      media_url: item.media_url ?? null,
      created_at: item.created_at,
      app: item.app ?? null,
      feedback_id: item.id,
    })),
    ...(replies ?? []).map((r) => ({
      id: r.id,
      type: 'reply' as const,
      is_admin: r.is_admin as boolean,
      body: r.body as string,
      category: undefined,
      media_url: r.media_url ?? null,
      created_at: r.created_at as string,
      app: null,
      feedback_id: r.feedback_id as string,
    })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return NextResponse.json({ messages, feedback_ids: feedbackIds });
}
