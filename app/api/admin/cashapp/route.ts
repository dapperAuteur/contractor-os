// app/api/admin/cashapp/route.ts
// GET: list CashApp payments with profile enrichment
// PATCH: verify or reject a CashApp payment

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createShopifyPromoCode } from '@/lib/shopify/createPromoCode';

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
    .select('id, user_id, status')
    .eq('id', id)
    .single();

  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (payment.status !== 'pending') {
    return NextResponse.json({ error: 'Payment already processed' }, { status: 400 });
  }

  if (action === 'reject') {
    await db.from('cashapp_payments').update({
      status: 'rejected',
      admin_notes: admin_notes ?? null,
      verified_by: admin.id,
      verified_at: new Date().toISOString(),
    }).eq('id', id);

    return NextResponse.json({ status: 'rejected' });
  }

  // Verify: upgrade user to lifetime
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

  return NextResponse.json({ status: 'verified', promo_code: promoCode });
}
