// app/api/admin/feedback/user/[userId]/reply/route.ts
// POST: admin replies in a user's conversation thread.
// Finds the user's latest feedback_id and creates a feedback_reply,
// then emails the user. Admin-only.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/mailgun';
import { feedbackReplyEmail } from '@/lib/email/templates';
import { requireAdmin } from '@/lib/auth/require-admin';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = auth.user;

  const { userId } = await params;
  const { body, media_url } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'body is required' }, { status: 400 });

  const db = getDb();

  // Find the user's latest feedback submission to attach the reply to
  const { data: latestFeedback } = await db
    .from('user_feedback')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestFeedback) {
    return NextResponse.json({ error: 'No feedback from this user' }, { status: 404 });
  }

  const { data: reply, error } = await db
    .from('feedback_replies')
    .insert({
      feedback_id: latestFeedback.id,
      sender_id: admin.id,
      is_admin: true,
      body: body.trim(),
      media_url: media_url || null,
    })
    .select('id, feedback_id, sender_id, is_admin, body, media_url, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email the user
  try {
    const { data: authUser } = await db.auth.admin.getUserById(userId);
    const userEmail = authUser?.user?.email;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    if (userEmail) {
      // Skipped (logged once) when Mailgun is not configured; the reply is already saved.
      await sendEmail({ to: userEmail, ...feedbackReplyEmail({ body, siteUrl }), tags: ['feedback-reply'] });
    }
  } catch (e) {
    console.error('[admin-feedback-user-reply] Email failed:', e);
  }

  return NextResponse.json(reply, { status: 201 });
}
