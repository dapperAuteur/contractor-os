// app/api/admin/campaigns/[id]/send/route.ts
// POST: send a campaign to its audience segment via Mailgun.
//
// Sending: Mailgun batch sends, one request per MAILGUN_BATCH_MAX (1,000) recipients, with
// recipient-variables so each person gets their own copy (only their address in To) and their
// own {{name}} (sent to Mailgun as %recipient.name%). One request per thousand keeps a send of a
// few thousand users well inside the function time limit, where the old one-request-per-user
// loop did not. A batch fails or succeeds as a whole, so its email_sends rows are written
// together with the same status.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { chunk, mailConfigured, sendEmail } from '@/lib/email/mailgun';
import { renderTemplate } from '@/lib/email/campaign-templates';
import { campaignEmail } from '@/lib/email/templates';
import { requireAdmin } from '@/lib/auth/require-admin';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface AudienceFilter {
  tiers?: string[];       // 'free' | 'monthly' | 'lifetime'
  roles?: string[];       // 'contractor' | 'lister' | 'teacher'
  activity?: string;      // 'active_7d' | 'active_30d' | 'inactive_30d'
  has_feature?: string;   // 'jobs' | 'courses' | 'equipment' | 'travel'
}

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

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

  // Mailgun not configured: refuse before touching the campaign, so it stays a draft and can be
  // sent once MAILGUN_API_KEY, MAILGUN_DOMAIN and EMAIL_FROM are set.
  if (!mailConfigured()) {
    return NextResponse.json(
      {
        error:
          'Email sending is not configured (MAILGUN_API_KEY, MAILGUN_DOMAIN or EMAIL_FROM is not set). The campaign was not sent.',
      },
      { status: 503 },
    );
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

    // Respect email marketing opt-out preference
    if (filteredRecipients.length > 0) {
      const recipientIds = filteredRecipients.map((r) => r.id);
      const { data: optedOut } = await db
        .from('notification_preferences')
        .select('user_id')
        .in('user_id', recipientIds)
        .eq('email_marketing', false);
      const optedOutIds = new Set((optedOut ?? []).map((o) => o.user_id));
      filteredRecipients = filteredRecipients.filter((r) => !optedOutIds.has(r.id));
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
    // {{name}} becomes a Mailgun recipient variable; everything else is the same for everyone.
    const body = renderTemplate(campaign.body_html, { siteUrl, name: '%recipient.name%' });
    const rendered = campaignEmail({ subject: campaign.subject, bodyHtml: body, siteUrl });

    let sentCount = 0;
    let failedCount = 0;

    for (const group of chunk(filteredRecipients)) {
      const recipientVariables: Record<string, { name: string }> = {};
      for (const r of group) recipientVariables[r.email] = { name: safeName(r.display_name) };

      const result = await sendEmail({
        to: group.map((r) => r.email),
        ...rendered,
        recipientVariables,
        tags: ['campaign', `campaign-${id}`.slice(0, 128)],
      });

      const now = new Date().toISOString();
      await db.from('email_sends').insert(
        group.map((r) =>
          result.sent
            ? { campaign_id: id, user_id: r.id, email: r.email, status: 'sent', sent_at: now }
            : {
                campaign_id: id,
                user_id: r.id,
                email: r.email,
                status: 'failed',
                error_message: `${result.reason}${result.status ? ` (${result.status})` : ''}${result.error ? `: ${result.error}` : ''}`.slice(0, 500),
              },
        ),
      );
      if (result.sent) sentCount += group.length;
      else failedCount += group.length;
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

/** Display name for the {{name}} slot: plain text only, since Mailgun puts it in both parts. */
function safeName(displayName: string | null | undefined): string {
  const cleaned = (displayName ?? '').replace(/[<>&"]/g, '').trim().slice(0, 80);
  return cleaned || 'there';
}
