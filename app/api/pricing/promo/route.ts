// app/api/pricing/promo/route.ts
// GET: return the currently active promo campaign (if any).
// No auth required — powers the pricing page for unauthenticated visitors.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const db = getDb();
  const now = new Date().toISOString();

  const { data: campaigns } = await db
    .from('admin_promo_campaigns')
    .select('id, name, discount_type, discount_value, promo_code, end_date, plan_types, stripe_coupon_id')
    .eq('is_active', true)
    .lte('start_date', now)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!campaigns?.length) return NextResponse.json(null);

  // Filter: end_date null or in future, and uses not exhausted
  const active = campaigns.find((c) => {
    if (c.end_date && new Date(c.end_date) < new Date()) return false;
    return true;
  });

  if (!active) return NextResponse.json(null);

  return NextResponse.json({
    id: active.id,
    name: active.name,
    discount_type: active.discount_type,
    discount_value: active.discount_value,
    promo_code: active.promo_code,
    end_date: active.end_date,
    plan_types: active.plan_types,
    stripe_coupon_id: active.stripe_coupon_id,
  });
}
