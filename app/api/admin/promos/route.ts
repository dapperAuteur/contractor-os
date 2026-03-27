// app/api/admin/promos/route.ts
// GET: list promo campaigns
// POST: create campaign + auto-create Stripe coupon

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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const { data, error } = await db
    .from('admin_promo_campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { name, description, discount_type, discount_value, plan_types, promo_code, start_date, end_date, max_uses } = body;

  if (!name?.trim() || !discount_type || !discount_value) {
    return NextResponse.json({ error: 'name, discount_type, and discount_value are required' }, { status: 400 });
  }

  // Auto-create Stripe coupon
  let stripeCouponId: string | null = null;

  if (discount_type === 'percentage') {
    try {
      const coupon = await stripe.coupons.create({
        percent_off: Number(discount_value),
        duration: 'once',
        name: name.trim(),
      });
      stripeCouponId = coupon.id;
    } catch (err) {
      return NextResponse.json({ error: `Stripe error: ${err instanceof Error ? err.message : 'Unknown'}` }, { status: 502 });
    }
  } else if (discount_type === 'fixed') {
    try {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(Number(discount_value) * 100),
        currency: 'usd',
        duration: 'once',
        name: name.trim(),
      });
      stripeCouponId = coupon.id;
    } catch (err) {
      return NextResponse.json({ error: `Stripe error: ${err instanceof Error ? err.message : 'Unknown'}` }, { status: 502 });
    }
  }
  // free_months: no Stripe coupon needed

  const db = getDb();
  const { data, error } = await db
    .from('admin_promo_campaigns')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      discount_type,
      discount_value: Number(discount_value),
      stripe_coupon_id: stripeCouponId,
      plan_types: plan_types || ['lifetime'],
      promo_code: promo_code?.trim()?.toUpperCase() || null,
      start_date: start_date || new Date().toISOString(),
      end_date: end_date || null,
      max_uses: max_uses ? Number(max_uses) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
