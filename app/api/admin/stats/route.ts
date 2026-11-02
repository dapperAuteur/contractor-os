// app/api/admin/stats/route.ts
// Aggregate stats for the admin overview dashboard.
// CentenarianOS module counts (recipes, focus, meals, daily logs, tasks) removed in plan 18 Phase 1.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';
import { CONTRACTOR_NET } from '@/lib/pricing/prices';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = getServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    profilesRes,
    newUsersRes,
    blogPostsRes,
    newBlogRes,
    jobsRes,
    blogViewsRes,
    promoPendingRes,
    paidLifetimeRes,
    cashappPendingRes,
    cashappVerifiedRes,
    foundersLimitRes,
  ] = await Promise.all([
    db.from('profiles').select('subscription_status', { count: 'exact' }),
    db.from('profiles').select('id', { count: 'exact' }).gte('created_at', weekAgo),
    db.from('blog_posts').select('visibility', { count: 'exact' }),
    db.from('blog_posts').select('id', { count: 'exact' }).gte('created_at', weekAgo),
    db.from('contractor_jobs').select('id', { count: 'exact', head: true }),
    db.from('blog_events').select('id', { count: 'exact' }).eq('event_type', 'view'),
    db.from('profiles').select('id', { count: 'exact' }).eq('subscription_status', 'lifetime').is('shirt_promo_code', null),
    db.from('profiles').select('id', { count: 'exact' }).eq('subscription_status', 'lifetime').not('stripe_customer_id', 'is', null),
    db.from('cashapp_payments').select('id', { count: 'exact' }).eq('status', 'pending'),
    db.from('cashapp_payments').select('id', { count: 'exact' }).eq('status', 'verified'),
    db.from('platform_settings').select('value').eq('key', 'lifetime_founders_limit').maybeSingle(),
  ]);

  const profiles = profilesRes.data ?? [];
  const free = profiles.filter((p) => p.subscription_status === 'free').length;
  const monthly = profiles.filter((p) => p.subscription_status === 'monthly').length;
  const lifetime = profiles.filter((p) => p.subscription_status === 'lifetime').length;

  const publicPosts = (blogPostsRes.data ?? []).filter((p) => p.visibility === 'public').length;

  return NextResponse.json({
    users: {
      total: profilesRes.count ?? 0,
      free,
      monthly,
      lifetime,
      newThisWeek: newUsersRes.count ?? 0,
    },
    content: {
      blogPosts: blogPostsRes.count ?? 0,
      publicPosts,
      newBlogThisWeek: newBlogRes.count ?? 0,
    },
    featureUsage: {
      jobs: jobsRes.count ?? 0,
      blogViews: blogViewsRes.count ?? 0,
    },
    revenue: {
      // Net of card fees, from the one price source (lib/pricing/prices.ts).
      lifetimeRevenue: lifetime * CONTRACTOR_NET.lifetime,
      monthlyMRR: monthly * CONTRACTOR_NET.monthly,
    },
    promoCodesPending: promoPendingRes.count ?? 0,
    founders: {
      limit: Number(foundersLimitRes.data?.value ?? 100),
      paidLifetime: paidLifetimeRes.count ?? 0,
      cashappVerified: cashappVerifiedRes.count ?? 0,
      cashappPending: cashappPendingRes.count ?? 0,
      totalPaid: (paidLifetimeRes.count ?? 0) + (cashappVerifiedRes.count ?? 0),
      giftedLifetime: lifetime - (paidLifetimeRes.count ?? 0),
      remaining: Math.max(0, Number(foundersLimitRes.data?.value ?? 100) - ((paidLifetimeRes.count ?? 0) + (cashappVerifiedRes.count ?? 0))),
    },
  });
}
