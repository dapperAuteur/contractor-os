// app/api/feedback/[id]/replies/route.ts
// GET: user views replies to their feedback
// POST: user adds a reply to their own feedback thread

import { NextRequest, NextResponse, after } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/mailgun';
import { adminFeedbackReplyNotice } from '@/lib/email/templates';
import { mirrorFeedbackToInbox } from '@/lib/feedback/inbox-mirror';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Verify ownership
  const { data: feedback } = await db
    .from('user_feedback')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!feedback) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: replies, error } = await db
    .from('feedback_replies')
    .select('id, is_admin, body, media_url, created_at')
    .eq('feedback_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ replies });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { body, media_url } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'body is required' }, { status: 400 });

  const db = getDb();

  // Verify ownership
  const { data: feedback } = await db
    .from('user_feedback')
    .select('id, category, message')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!feedback) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  const { data: reply, error } = await db
    .from('feedback_replies')
    .insert({ feedback_id: id, sender_id: user.id, is_admin: isAdmin, body: body.trim(), media_url: media_url || null })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify admin via email (only when a non-admin user replies)
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    if (adminEmail && !isAdmin) {
      // Skipped (logged once) when Mailgun is not configured; the reply is already saved.
      await sendEmail({
        to: adminEmail,
        ...adminFeedbackReplyNotice({ userEmail: user.email ?? '', body, siteUrl }),
        replyTo: user.email ?? undefined,
        tags: ['admin-notice', 'feedback-reply'],
      });
    }
  } catch (e) {
    console.error('[feedback-reply] Email failed:', e);
  }

  // Mirror user (not admin) replies to the WitUS Inbox, non-blocking, so the
  // follow-up reaches BAM's triage view. Admin replies are BAM's own.
  if (!isAdmin) {
    after(() =>
      mirrorFeedbackToInbox({
        category: feedback.category,
        message: body.trim(),
        feedbackId: id,
        kind: 'reply',
        submitterEmail: user.email,
      })
    );
  }

  return NextResponse.json({ id: reply.id }, { status: 201 });
}
