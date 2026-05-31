// app/api/admin/promos/reactivate-lifetime/route.ts
// One-call admin action: create a contractor lifetime promo campaign + a
// matching marketing banner pointing at /pricing. Both are app='contractor'
// so CentenarianOS is unaffected.
//
// Body shape:
//   {
//     name: string,                       // e.g. "Holiday Lifetime"
//     description?: string,
//     discount_type: 'percentage'|'fixed'|'free_months',
//     discount_value: number,
//     promo_code?: string,
//     end_date?: ISO,                     // either this or max_uses (or both) required
//     max_uses?: number,
//     banner_title?: string,              // defaults to the campaign name
//     banner_body?: string,               // defaults to a sensible template
//     target_tiers?: string[],            // defaults to ['free','monthly']
//   }
//
// Returns { campaign, banner } on success.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

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

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const {
    name,
    description,
    discount_type,
    discount_value,
    promo_code,
    end_date,
    max_uses,
    banner_title,
    banner_body,
    target_tiers,
  } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!['percentage', 'fixed', 'free_months'].includes(discount_type)) {
    return NextResponse.json({ error: 'discount_type must be percentage|fixed|free_months' }, { status: 400 });
  }
  if (typeof discount_value !== 'number' || discount_value < 0) {
    return NextResponse.json({ error: 'discount_value must be a non-negative number' }, { status: 400 });
  }
  if (!end_date && !max_uses) {
    return NextResponse.json(
      { error: 'Provide at least one of end_date or max_uses so the promo has a natural close.' },
      { status: 400 },
    );
  }

  // Auto-create the Stripe coupon when the discount is monetary.
  let stripeCouponId: string | null = null;
  if (discount_type === 'percentage') {
    try {
      const coupon = await stripe.coupons.create({
        percent_off: discount_value,
        duration: 'once',
        name: name.trim(),
      });
      stripeCouponId = coupon.id;
    } catch (err) {
      return NextResponse.json(
        { error: `Stripe coupon creation failed: ${err instanceof Error ? err.message : 'Unknown'}` },
        { status: 502 },
      );
    }
  } else if (discount_type === 'fixed') {
    try {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discount_value * 100),
        currency: 'usd',
        duration: 'once',
        name: name.trim(),
      });
      stripeCouponId = coupon.id;
    } catch (err) {
      return NextResponse.json(
        { error: `Stripe coupon creation failed: ${err instanceof Error ? err.message : 'Unknown'}` },
        { status: 502 },
      );
    }
  }

  const db = getDb();

  const { data: campaign, error: campaignError } = await db
    .from('admin_promo_campaigns')
    .insert({
      app: 'contractor',
      name: name.trim(),
      description: description?.trim() || 'Admin-initiated lifetime reactivation promo',
      discount_type,
      discount_value,
      stripe_coupon_id: stripeCouponId,
      plan_types: ['contractor-lifetime'],
      promo_code: promo_code?.trim()?.toUpperCase() || null,
      start_date: new Date().toISOString(),
      end_date: end_date || null,
      max_uses: max_uses ? Number(max_uses) : null,
    })
    .select()
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json(
      { error: campaignError?.message ?? 'Failed to create campaign' },
      { status: 500 },
    );
  }

  // Default banner copy if admin didn't supply one.
  const defaultBody =
    discount_type === 'percentage'
      ? `Lifetime membership is back — ${discount_value}% off through ${end_date ? new Date(end_date).toLocaleDateString() : 'while spots last'}.`
      : discount_type === 'fixed'
      ? `Lifetime membership is back — $${discount_value} off through ${end_date ? new Date(end_date).toLocaleDateString() : 'while spots last'}.`
      : 'Lifetime membership is back. Limited time.';

  const { data: banner, error: bannerError } = await db
    .from('marketing_banners')
    .insert({
      app: 'contractor',
      title: (banner_title?.trim() || name.trim()),
      body: (banner_body?.trim() || defaultBody),
      cta_text: 'Get lifetime',
      cta_url: '/pricing',
      target_tiers: Array.isArray(target_tiers) && target_tiers.length > 0
        ? target_tiers
        : ['free', 'monthly'],
      is_active: true,
      starts_at: new Date().toISOString(),
      ends_at: end_date || null,
    })
    .select()
    .single();

  if (bannerError) {
    // Campaign was created; banner failed. Surface the error but include the campaign
    // so the admin can decide whether to deactivate the campaign or create the banner manually.
    return NextResponse.json(
      { error: `Campaign created, banner failed: ${bannerError.message}`, campaign },
      { status: 207 },
    );
  }

  return NextResponse.json({ campaign, banner }, { status: 201 });
}
