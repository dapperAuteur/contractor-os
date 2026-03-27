// app/api/pricing/founders/route.ts
// GET: public founders counter — how many lifetime spots remain.
// No auth required (powers the pricing page for unauthenticated visitors).

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

  // Fetch settings
  const { data: settings } = await db
    .from('platform_settings')
    .select('key, value')
    .in('key', ['lifetime_founders_limit', 'lifetime_founders_label']);

  const settingsMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  const limit = Number(settingsMap.lifetime_founders_limit ?? 100);
  const label = settingsMap.lifetime_founders_label ?? "Founder's Price";

  // Count paid lifetime users (Stripe — excludes invited/gifted)
  const { count: stripeLifetime } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_status', 'lifetime')
    .not('stripe_customer_id', 'is', null);

  // Count verified CashApp lifetime purchases
  const { count: cashappVerified } = await db
    .from('cashapp_payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'verified');

  const count = (stripeLifetime ?? 0) + (cashappVerified ?? 0);
  const remaining = Math.max(0, limit - count);

  return NextResponse.json({
    limit,
    label,
    count,
    remaining,
    active: remaining > 0,
  });
}
