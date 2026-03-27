// app/api/stripe/checkout/route.ts
// Creates a Stripe Checkout session for monthly, lifetime, contractor, lister, or teacher plans

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

const VALID_PLANS = [
  'monthly', 'lifetime',
  'teacher', 'teacher-annual',
  'contractor-monthly', 'contractor-annual',
  'lister-monthly', 'lister-annual',
];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { plan, stripeCouponId } = await request.json();
  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, subscription_status')
    .eq('id', user.id)
    .single();

  // Block redundant upgrades (only for main Work.WitUS plans)
  const isTeacherPlan = plan === 'teacher' || plan === 'teacher-annual';
  const isContractorPlan = plan.startsWith('contractor-');
  const isListerPlan = plan.startsWith('lister-');
  const isProductPlan = isContractorPlan || isListerPlan || isTeacherPlan;

  if (!isProductPlan && profile?.subscription_status === 'lifetime') {
    return NextResponse.json({ error: 'Already a lifetime member' }, { status: 400 });
  }

  // Block lifetime purchases when founders limit is exhausted
  // UNLESS an admin promo campaign coupon is provided (promo overrides the lock)
  if (plan === 'lifetime' || plan === 'contractor-lifetime') {
    const db = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Count paid lifetime (Stripe + CashApp)
    const [{ count: stripeCount }, { count: cashappCount }] = await Promise.all([
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'lifetime').not('stripe_customer_id', 'is', null),
      db.from('cashapp_payments').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
    ]);
    const { data: limitSetting } = await db.from('platform_settings').select('value').eq('key', 'lifetime_founders_limit').maybeSingle();
    const limit = Number(limitSetting?.value ?? 100);
    const paidCount = (stripeCount ?? 0) + (cashappCount ?? 0);

    if (paidCount >= limit) {
      // Check if a valid admin promo campaign allows this purchase
      let promoBypass = false;
      if (stripeCouponId) {
        const { data: campaign } = await db
          .from('admin_promo_campaigns')
          .select('id, is_active, plan_types')
          .eq('stripe_coupon_id', stripeCouponId)
          .eq('is_active', true)
          .maybeSingle();

        if (campaign) {
          const planTypes = Array.isArray(campaign.plan_types) ? campaign.plan_types : [];
          promoBypass = planTypes.includes('lifetime');
        }
      }

      if (!promoBypass) {
        return NextResponse.json({
          error: 'Lifetime founder spots are sold out. Please choose monthly or annual.',
        }, { status: 400 });
      }
    }
  }

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  // Prefer the actual request origin so subdomain users (contractor.*, lister.*) get
  // redirected back to their subdomain after Stripe checkout, not the main domain.
  const baseUrl = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  let session;

  if (isTeacherPlan) {
    const teacherPriceId = plan === 'teacher-annual'
      ? process.env.TEACHER_ANNUAL_PRICE_ID
      : process.env.TEACHER_MONTHLY_PRICE_ID;
    if (!teacherPriceId) {
      return NextResponse.json({ error: 'Teacher plan not configured' }, { status: 503 });
    }
    session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: teacherPriceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/teaching?onboarded=true`,
      cancel_url: `${baseUrl}/academy/teach`,
      metadata: { supabase_user_id: user.id, plan: 'teacher' },
    });
  } else if (isContractorPlan) {
    const priceId = plan === 'contractor-annual'
      ? process.env.STRIPE_CONTRACTOR_ANNUAL_PRICE_ID
      : process.env.STRIPE_CONTRACTOR_MONTHLY_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: 'Contractor plan not configured' }, { status: 503 });
    }
    session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/contractor?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { supabase_user_id: user.id, plan: 'contractor' },
    });
  } else if (isListerPlan) {
    const priceId = plan === 'lister-annual'
      ? process.env.STRIPE_LISTER_ANNUAL_PRICE_ID
      : process.env.STRIPE_LISTER_MONTHLY_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: 'Lister plan not configured' }, { status: 503 });
    }
    session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/contractor/lister?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/lister-pricing`,
      metadata: { supabase_user_id: user.id, plan: 'lister' },
    });
  } else if (plan === 'monthly') {
    session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_MONTHLY_PRICE_ID!, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { supabase_user_id: user.id, plan: 'monthly' },
    });
  } else {
    // lifetime
    session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: process.env.STRIPE_LIFETIME_PRICE_ID!, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { supabase_user_id: user.id, plan: 'lifetime' },
    });
  }

  return NextResponse.json({ url: session.url });
}
