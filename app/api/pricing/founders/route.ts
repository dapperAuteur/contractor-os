// app/api/pricing/founders/route.ts
// GET: public founders counter — how many lifetime spots remain.
// No auth required (powers the pricing page for unauthenticated visitors).
//
// Paid user distinction:
//   - Stripe paid: subscription_status='lifetime' AND stripe_customer_id IS NOT NULL
//   - CashApp paid: cashapp_payments.status='verified'
//   - Excluded: invited/gifted users (lifetime status but no stripe_customer_id and no cashapp)
//   - Excluded: demo, admin, sample accounts
//
// When remaining = 0, the pricing page hides the lifetime card and
// shows only monthly + annual. The checkout route also blocks lifetime purchases.

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

  // Count PAID lifetime users only (Stripe-verified — has stripe_customer_id)
  // This excludes:
  //   - Demo accounts (no stripe_customer_id)
  //   - Admin-gifted lifetime (no stripe_customer_id)
  //   - Invited users (no stripe_customer_id)
  //   - Sample/test users (no stripe_customer_id)
  const { count: stripeLifetime } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_status', 'lifetime')
    .not('stripe_customer_id', 'is', null);

  // Count verified CashApp lifetime purchases (distinct user_id)
  const { data: cashappUsers } = await db
    .from('cashapp_payments')
    .select('user_id')
    .eq('status', 'verified');

  const cashappCount = new Set((cashappUsers ?? []).map((c) => c.user_id)).size;

  // Total paid lifetime = Stripe + CashApp (avoid double-counting)
  // A user could have both a stripe_customer_id AND a verified cashapp —
  // but that's unlikely. For accuracy, count unique user_ids across both.
  const paidStripeIds = new Set<string>();
  if ((stripeLifetime ?? 0) > 0) {
    const { data: stripeUsers } = await db
      .from('profiles')
      .select('id')
      .eq('subscription_status', 'lifetime')
      .not('stripe_customer_id', 'is', null);
    for (const u of stripeUsers ?? []) paidStripeIds.add(u.id);
  }

  const allPaidIds = new Set([...paidStripeIds, ...(cashappUsers ?? []).map((c) => c.user_id)]);
  const count = allPaidIds.size;
  const remaining = Math.max(0, limit - count);

  return NextResponse.json({
    limit,
    label,
    count,
    remaining,
    active: remaining > 0,
  });
}
