// app/api/admin/messages/route.ts
// Admin: send messages to users and list sent messages

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chunk, mailConfigured, sendEmail } from '@/lib/email/mailgun';
import { adminMessageEmail } from '@/lib/email/templates';
import { requireAdmin } from '@/lib/auth/require-admin';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = getServiceClient();
  const { data: messages, error } = await db
    .from('admin_messages')
    .select('*, message_reads(count)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { subject, body, recipient_scope, recipient_user_id } = await request.json();

  if (!subject || !body || !recipient_scope) {
    return NextResponse.json({ error: 'subject, body, and recipient_scope are required' }, { status: 400 });
  }

  const db = getServiceClient();

  // Save message to DB
  const { data: message, error: insertError } = await db
    .from('admin_messages')
    .insert({
      subject,
      body,
      recipient_scope,
      recipient_user_id: recipient_scope === 'user' ? recipient_user_id : null,
    })
    .select()
    .single();

  if (insertError || !message) {
    return NextResponse.json({ error: insertError?.message ?? 'Insert failed' }, { status: 500 });
  }

  // Gather target user emails
  let emails: string[] = [];
  const { data: authUsers } = await db.auth.admin.listUsers({ perPage: 1000 });
  const allUsers = authUsers?.users ?? [];

  if (recipient_scope === 'all') {
    emails = allUsers.map((u) => u.email).filter(Boolean) as string[];
  } else if (recipient_scope === 'user') {
    const target = allUsers.find((u) => u.id === recipient_user_id);
    if (target?.email) emails = [target.email];
  } else {
    // free | monthly | lifetime — filter by subscription_status
    const { data: profiles } = await db
      .from('profiles')
      .select('id, subscription_status')
      .eq('subscription_status', recipient_scope);
    const ids = new Set((profiles ?? []).map((p) => p.id));
    emails = allUsers.filter((u) => ids.has(u.id) && u.email).map((u) => u.email as string);
  }

  // The in-app message is already saved. With Mailgun not configured (MAILGUN_API_KEY,
  // MAILGUN_DOMAIN, EMAIL_FROM), skip only the email copy and say so, rather than failing.
  if (!mailConfigured()) {
    return NextResponse.json({ ok: true, messageId: message.id, sent: 0, total: emails.length, emailSkipped: true });
  }

  // Email copies via Mailgun batch sends: one request per 1,000 recipients (Mailgun's batch cap).
  // sendEmail adds recipient-variables for multi-recipient sends, so each person sees only their
  // own address in To.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const rendered = adminMessageEmail({ subject, body, siteUrl });
  let sent = 0;
  for (const group of chunk(emails)) {
    const result = await sendEmail({ to: group, ...rendered, tags: ['admin-message'] });
    if (result.sent) sent += group.length;
    else console.error('[admin-messages] Batch send failed:', result.reason, result.status ?? '');
  }

  return NextResponse.json({ ok: true, messageId: message.id, sent, total: emails.length });
}
