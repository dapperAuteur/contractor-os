// app/api/admin/cashapp/route.ts
// GET: list CashApp payments with profile enrichment
// PATCH: verify or reject — on verify, upgrades user + sends email notification

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createShopifyPromoCode } from '@/lib/shopify/createPromoCode';
import { getResend } from '@/lib/email/resend';

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

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, action, admin_notes } = await request.json();

  if (!id || !['verify', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'id and action (verify|reject) required' }, { status: 400 });
  }

  const db = getDb();

  const { data: payment } = await db
    .from('cashapp_payments')
    .select('id, user_id, status, cashapp_name, amount')
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

    // Notify user of rejection
    if (userEmail) {
      try {
        const resend = getResend();
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'admin@work.witus.online',
          to: userEmail,
          subject: 'Work.WitUS — CashApp Payment Update',
          html: buildRejectionEmail(userProfile?.display_name || userProfile?.username || 'there', admin_notes),
        });
      } catch { /* non-critical */ }
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

  // Notify user of verification via email
  if (userEmail) {
    try {
      const resend = getResend();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://work.witus.online';
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'admin@work.witus.online',
        to: userEmail,
        subject: 'Work.WitUS — Your Lifetime Membership is Active! 🎉',
        html: buildVerificationEmail(
          userProfile?.display_name || userProfile?.username || 'there',
          promoCode,
          siteUrl,
        ),
      });
    } catch { /* non-critical */ }
  }

  return NextResponse.json({ status: 'verified', promo_code: promoCode });
}

// ─── Email Templates ────────────────────────────────────────────────

function buildVerificationEmail(name: string, promoCode: string | null, siteUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lifetime Active</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:32px 24px;">
  <div style="text-align:center;padding-bottom:24px;border-bottom:1px solid #e2e8f0;margin-bottom:24px;">
    <a href="${siteUrl}" style="font-size:20px;font-weight:800;color:#d97706;text-decoration:none;">Work.WitUS</a>
  </div>
  <h1 style="font-size:22px;color:#0f172a;margin:0 0 12px;">Your Lifetime Membership is Active!</h1>
  <p style="font-size:15px;color:#475569;line-height:1.6;">Hey ${name},</p>
  <p style="font-size:15px;color:#475569;line-height:1.6;">Your CashApp payment has been verified and your <strong>Lifetime membership</strong> is now active. You have full, unlimited access to every feature — forever. No renewals, no expiration.</p>
  ${promoCode ? `
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
    <p style="font-size:13px;color:#92400e;margin:0 0 4px;">Your free shirt promo code:</p>
    <p style="font-size:20px;font-weight:700;color:#d97706;margin:0;font-family:monospace;">${promoCode}</p>
    <p style="font-size:12px;color:#92400e;margin:4px 0 0;">Use it at checkout in our merch store!</p>
  </div>` : ''}
  <p style="text-align:center;margin:24px 0;">
    <a href="${siteUrl}/dashboard/contractor" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">Go to Dashboard</a>
  </p>
  <p style="font-size:15px;color:#475569;line-height:1.6;">Welcome to the founding crew. 🤝</p>
</div>
<div style="text-align:center;padding-top:24px;font-size:12px;color:#94a3b8;">
  <p>&copy; ${new Date().getFullYear()} Work.WitUS. All rights reserved.</p>
</div>
</div>
</body></html>`;
}

function buildRejectionEmail(name: string, adminNotes: string | null): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment Update</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:32px 24px;">
  <div style="text-align:center;padding-bottom:24px;border-bottom:1px solid #e2e8f0;margin-bottom:24px;">
    <span style="font-size:20px;font-weight:800;color:#d97706;">Work.WitUS</span>
  </div>
  <h1 style="font-size:22px;color:#0f172a;margin:0 0 12px;">CashApp Payment Update</h1>
  <p style="font-size:15px;color:#475569;line-height:1.6;">Hey ${name},</p>
  <p style="font-size:15px;color:#475569;line-height:1.6;">We were unable to verify your CashApp payment. This usually means the payment wasn't received or the CashApp name didn't match.</p>
  ${adminNotes ? `<p style="font-size:14px;color:#64748b;line-height:1.6;background:#f1f5f9;padding:12px;border-radius:8px;"><strong>Note:</strong> ${adminNotes}</p>` : ''}
  <p style="font-size:15px;color:#475569;line-height:1.6;">If you believe this is an error, please reply to this email or use the in-app feedback form and we'll sort it out.</p>
</div>
<div style="text-align:center;padding-top:24px;font-size:12px;color:#94a3b8;">
  <p>&copy; ${new Date().getFullYear()} Work.WitUS. All rights reserved.</p>
</div>
</div>
</body></html>`;
}
