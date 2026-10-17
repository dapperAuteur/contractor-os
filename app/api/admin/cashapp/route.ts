// app/api/admin/cashapp/route.ts
// GET: list CashApp payments with profile enrichment
// PATCH: verify or reject — on verify, upgrades user + sends email notification

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createShopifyPromoCode } from '@/lib/shopify/createPromoCode';
import { incrementCampaignUses } from '@/lib/promo/active-lifetime-promo';
import { sendEmail } from '@/lib/email/mailgun';
import { cashappRejectedEmail, cashappVerifiedEmail } from '@/lib/email/templates';
import { requireAdmin } from '@/lib/auth/require-admin';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const status = request.nextUrl.searchParams.get('status');
  const db = getDb();

  let query = db
    .from('cashapp_payments')
    .select('*, profiles:user_id(username, email, display_name, subscription_status)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = auth.user;

  const { id, action, admin_notes } = await request.json();

  if (!id || !['verify', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'id and action (verify|reject) required' }, { status: 400 });
  }

  const db = getDb();

  const { data: payment } = await db
    .from('cashapp_payments')
    .select('id, user_id, status, cashapp_name, amount, promo_campaign_id')
    .eq('id', id)
    .single();

  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (payment.status !== 'pending') {
    return NextResponse.json({ error: 'Payment already processed' }, { status: 400 });
  }

  // Get user email for notification
  const { data: userProfile } = await db
    .from('profiles')
    .select('email, display_name, username')
    .eq('id', payment.user_id)
    .single();

  // Also get auth email (profiles.email may be null)
  const { data: { user: authUser } } = await db.auth.admin.getUserById(payment.user_id);
  const userEmail = userProfile?.email || authUser?.email;

  if (action === 'reject') {
    await db.from('cashapp_payments').update({
      status: 'rejected',
      admin_notes: admin_notes ?? null,
      verified_by: admin.id,
      verified_at: new Date().toISOString(),
    }).eq('id', id);

    // Notify user of rejection. Non-critical: sendEmail never throws, and skips when Mailgun is
    // not configured.
    if (userEmail) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://work.witus.online';
      await sendEmail({
        to: userEmail,
        ...cashappRejectedEmail({
          name: userProfile?.display_name || userProfile?.username || 'there',
          adminNotes: admin_notes ?? null,
          siteUrl,
        }),
        tags: ['cashapp', 'cashapp-rejected'],
      });
    }

    return NextResponse.json({ status: 'rejected' });
  }

  // ─── Verify: upgrade user to lifetime ───────────────────────────

  await db.from('cashapp_payments').update({
    status: 'verified',
    admin_notes: admin_notes ?? null,
    verified_by: admin.id,
    verified_at: new Date().toISOString(),
  }).eq('id', id);

  // Generate Shopify promo code
  let promoCode: string | null = null;
  try {
    promoCode = await createShopifyPromoCode();
  } catch {
    // Non-critical — promo code can be retried later
  }

  // Update profile to lifetime
  await db.from('profiles').update({
    subscription_status: 'lifetime',
    stripe_subscription_id: null,
    subscription_expires_at: null,
    cancel_at_period_end: false,
    shirt_promo_code: promoCode,
  }).eq('id', payment.user_id);

  // If this CashApp payment was submitted during an active promo, increment
  // the campaign's use count (and auto-deactivate if max_uses reached).
  if (payment.promo_campaign_id) {
    try {
      await incrementCampaignUses(db, payment.promo_campaign_id);
    } catch { /* non-critical — admin can re-run if needed */ }
  }

  // Notify user of verification via email (non-critical; skipped when Mailgun is not configured)
  if (userEmail) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://work.witus.online';
    await sendEmail({
      to: userEmail,
      ...cashappVerifiedEmail({
        name: userProfile?.display_name || userProfile?.username || 'there',
        promoCode,
        siteUrl,
      }),
      tags: ['cashapp', 'cashapp-verified'],
    });
  }

  return NextResponse.json({ status: 'verified', promo_code: promoCode });
}
