// app/api/admin/campaigns/[id]/send/route.ts
// POST: send a campaign to its audience segment via Resend

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getResend } from '@/lib/email/resend';
import { renderTemplate } from '@/lib/email/campaign-templates';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return user;
}

interface AudienceFilter {
  tiers?: string[];       // 'free' | 'monthly' | 'lifetime'
  roles?: string[];       // 'contractor' | 'lister' | 'teacher'
  activity?: string;      // 'active_7d' | 'active_30d' | 'inactive_30d'
  has_feature?: string;   // 'jobs' | 'courses' | 'equipment' | 'travel'
}

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();

  // Fetch campaign
  const { data: campaign, error: fetchErr } = await db
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (campaign.status === 'sent' || campaign.status === 'sending') {
    return NextResponse.json({ error: 'Campaign already sent or in progress' }, { status: 409 });
  }

  // Mark as sending
  await db.from('email_campaigns').update({ status: 'sending' }).eq('id', id);

  try {
    // Build audience query
    const filter: AudienceFilter = campaign.audience_filter || {};
    let query = db.from('profiles').select('id, email, display_name, subscription_status, contractor_role');

    if (filter.tiers && filter.tiers.length > 0) {
      query = query.in('subscription_status', filter.tiers);
    }
    if (filter.roles && filter.roles.length > 0) {
      query = query.in('contractor_role', filter.roles);
    }

    const { data: recipients, error: queryErr } = await query;
    if (queryErr) throw new Error(queryErr.message);

    // Filter by activity if specified
    let filteredRecipients = recipients ?? [];
    if (filter.activity && filteredRecipients.length > 0) {
      const now = Date.now();
      const ids = filteredRecipients.map((r) => r.id);
      const { data: events } = await db
        .from('usage_events')
        .select('user_id, created_at')
        .in('user_id', ids)
        .order('created_at', { ascending: false });

      const lastActivity = new Map<string, number>();
      for (const e of events ?? []) {
        if (!lastActivity.has(e.user_id)) {
          lastActivity.set(e.user_id, new Date(e.created_at).getTime());
        }
      }

      if (filter.activity === 'active_7d') {
        filteredRecipients = filteredRecipients.filter((r) => {
          const last = lastActivity.get(r.id);
          return last && (now - last) < 7 * 86400000;
        });
      } else if (filter.activity === 'active_30d') {
        filteredRecipients = filteredRecipients.filter((r) => {
          const last = lastActivity.get(r.id);
          return last && (now - last) < 30 * 86400000;
        });
      } else if (filter.activity === 'inactive_30d') {
        filteredRecipients = filteredRecipients.filter((r) => {
          const last = lastActivity.get(r.id);
          return !last || (now - last) >= 30 * 86400000;
        });
      }
    }

    // Filter by feature usage if specified
    if (filter.has_feature && filteredRecipients.length > 0) {
      const featureTable: Record<string, string> = {
        jobs: 'contractor_jobs',
        courses: 'enrollments',
        equipment: 'equipment_items',
        travel: 'trips',
      };
      const table = featureTable[filter.has_feature];
      if (table) {
        const ids = filteredRecipients.map((r) => r.id);
        const { data: featureUsers } = await db
          .from(table)
          .select('user_id')
          .in('user_id', ids);
        const hasFeature = new Set((featureUsers ?? []).map((u) => u.user_id));
        filteredRecipients = filteredRecipients.filter((r) => hasFeature.has(r.id));
      }
    }

    // Remove recipients without email
    filteredRecipients = filteredRecipients.filter((r) => r.email);

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'admin@work.witus.online';
    const resend = getResend();

    let sentCount = 0;
    let failedCount = 0;

    // Send in batches of 50
    const batchSize = 50;
    for (let i = 0; i < filteredRecipients.length; i += batchSize) {
      const batch = filteredRecipients.slice(i, i + batchSize);

      const sendPromises = batch.map(async (recipient) => {
        const html = renderTemplate(campaign.body_html, {
          siteUrl,
          name: recipient.display_name || 'there',
        });

        try {
          await resend.emails.send({
            from: fromEmail,
            to: recipient.email,
            subject: campaign.subject,
            html,
          });

          await db.from('email_sends').insert({
            campaign_id: id,
            user_id: recipient.id,
            email: recipient.email,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
          sentCount++;
        } catch (err) {
          await db.from('email_sends').insert({
            campaign_id: id,
            user_id: recipient.id,
            email: recipient.email,
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
          });
          failedCount++;
        }
      });

      await Promise.all(sendPromises);
    }

    // Update campaign status
    await db.from('email_campaigns').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
    }).eq('id', id);

    return NextResponse.json({ sent: sentCount, failed: failedCount, total: filteredRecipients.length });
  } catch (err) {
    await db.from('email_campaigns').update({ status: 'failed' }).eq('id', id);
    console.error('[Campaigns] Send failed:', err);
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}
