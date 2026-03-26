// app/api/admin/referrals/rewards/route.ts
// GET: list reward tiers + issued rewards
// POST: check and apply rewards for a specific referrer (called after marking an invite as paid)

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSessionClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function requireAdmin() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = serviceDb();

  const [tiersRes, rewardsRes] = await Promise.all([
    db.from('referral_reward_tiers')
      .select('*')
      .eq('app', 'contractor')
      .order('paid_referrals'),
    db.from('referral_rewards')
      .select('*, referral_reward_tiers(name, paid_referrals, reward_type, reward_months)')
      .order('applied_at', { ascending: false })
      .limit(100),
  ]);

  // Get profiles for reward recipients
  const userIds = [...new Set((rewardsRes.data ?? []).map((r) => r.user_id))];
  let profiles: Record<string, { username: string | null; display_name: string | null }> = {};
  if (userIds.length > 0) {
    const { data } = await db.from('profiles').select('id, username, display_name').in('id', userIds);
    profiles = Object.fromEntries((data ?? []).map((p) => [p.id, p]));
  }

  const rewards = (rewardsRes.data ?? []).map((r) => ({
    ...r,
    username: profiles[r.user_id]?.username ?? null,
    display_name: profiles[r.user_id]?.display_name ?? null,
  }));

  return NextResponse.json({
    tiers: tiersRes.data ?? [],
    rewards,
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { user_id } = await request.json();
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const db = serviceDb();

  // Count paid referrals for this user
  const { data: paidInvites } = await db
    .from('invited_users')
    .select('id')
    .eq('invited_by', user_id)
    .eq('is_paid', true);

  const paidCount = paidInvites?.length ?? 0;

  // Get tiers
  const { data: tiers } = await db
    .from('referral_reward_tiers')
    .select('*')
    .eq('app', 'contractor')
    .order('paid_referrals');

  // Get already-applied rewards
  const { data: existingRewards } = await db
    .from('referral_rewards')
    .select('tier_id')
    .eq('user_id', user_id);

  const appliedTierIds = new Set((existingRewards ?? []).map((r) => r.tier_id));

  // Find newly earned tiers
  const newlyEarned = (tiers ?? []).filter(
    (t) => paidCount >= t.paid_referrals && !appliedTierIds.has(t.id)
  );

  const applied: string[] = [];

  for (const tier of newlyEarned) {
    // Insert reward record
    await db.from('referral_rewards').insert({
      user_id,
      tier_id: tier.id,
      paid_count: paidCount,
    });

    applied.push(tier.name);

    // Apply the reward
    if (tier.reward_type === 'upgrade') {
      // Upgrade to lifetime
      await db.from('profiles').update({
        subscription_status: 'lifetime',
        subscription_expires_at: null,
      }).eq('id', user_id);
    }
    // Note: Stripe credit application would go here in production
    // For now, we track the reward and admin can manually apply Stripe credits
  }

  return NextResponse.json({
    paid_count: paidCount,
    newly_applied: applied,
    total_rewards: appliedTierIds.size + applied.length,
  });
}
