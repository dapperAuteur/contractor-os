// app/api/admin/feedback/user/[userId]/reply/route.ts
// POST: admin replies in a user's conversation thread.
// Finds the user's latest feedback_id and creates a feedback_reply,
// then emails the user. Admin-only.

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getResend } from '@/lib/email/resend';

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const admin = await getAdminUser();
  if (!admin || admin.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
      const resend = getResend();
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'admin@centenarianos.com',
        to: userEmail,
        subject: 'Work.WitUS team replied to your feedback',
        html: `<p>The Work.WitUS team replied to your feedback:</p>
               <blockquote style="border-left:3px solid #d97706;padding-left:12px;color:#374151;">${body.trim()}</blockquote>
               <p><a href="${siteUrl}/dashboard/feedback">View your conversation →</a></p>
               <p style="color:#9ca3af;font-size:12px;">— Work.WitUS Team</p>`,
      });
    }
  } catch (e) {
    console.error('[admin-feedback-user-reply] Email failed:', e);
  }

  return NextResponse.json(reply, { status: 201 });
}
