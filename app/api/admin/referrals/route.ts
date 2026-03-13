// app/api/admin/referrals/route.ts
// GET: Referral leaderboard — users who have sent peer invites, with invite stats and
//      downstream referral counts (depth-2 tree). Admin only.

import { NextResponse } from 'next/server';
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
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = serviceDb();

  // Fetch all peer invites (contractor/lister referrals, not admin-sent)
  const { data: allInvites, error } = await db
    .from('invited_users')
    .select('id, invited_by, user_id, email, product, accepted_at, is_paid, paid_at, subscription_tier, invited_at, invited_by_role')
    .in('invited_by_role', ['contractor', 'lister'])
    .order('invited_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const invites = allInvites ?? [];

  // Unique referrer IDs
  const referrerIds = [...new Set(invites.map((i) => i.invited_by).filter(Boolean))];

  if (referrerIds.length === 0) {
    return NextResponse.json({ referrers: [], totals: { total_referrers: 0, total_sent: 0, total_accepted: 0, total_paid: 0 } });
  }

  // Fetch profiles for all referrers
  const { data: profiles } = await db
    .from('profiles')
    .select('id, username, display_name, invite_limit')
    .in('id', referrerIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  // Build downstream map: for each user_id, how many invites did they send?
  const downstreamCount: Record<string, number> = {};
  for (const inv of invites) {
    if (inv.user_id) {
      const subsequent = invites.filter((i) => i.invited_by === inv.user_id).length;
      downstreamCount[inv.user_id] = subsequent;
    }
  }

  // Build leaderboard
  const referrers = referrerIds
    .map((userId) => {
      const userInvites = invites.filter((i) => i.invited_by === userId);
      const profile = profileMap[userId];
      const totalAccepted = userInvites.filter((i) => i.accepted_at).length;
      const totalPaid = userInvites.filter((i) => i.is_paid).length;

      // Depth-2: sum downstream invites from this user's accepted invitees
      const downstreamTotal = userInvites
        .filter((i) => i.user_id)
        .reduce((sum, i) => sum + (downstreamCount[i.user_id!] ?? 0), 0);

      return {
        user_id: userId,
        username: profile?.username ?? null,
        display_name: profile?.display_name ?? null,
        invite_limit: profile?.invite_limit ?? 10,
        total_sent: userInvites.length,
        total_accepted: totalAccepted,
        total_paid: totalPaid,
        downstream_total: downstreamTotal,
        invites: userInvites.map((inv) => ({
          id: inv.id,
          email: inv.email,
          product: inv.product,
          accepted_at: inv.accepted_at,
          is_paid: inv.is_paid,
          paid_at: inv.paid_at,
          subscription_tier: inv.subscription_tier,
          invited_at: inv.invited_at,
          user_id: inv.user_id,
          downstream: inv.user_id ? (downstreamCount[inv.user_id] ?? 0) : 0,
        })),
      };
    })
    .sort((a, b) => (b.total_accepted + b.downstream_total) - (a.total_accepted + a.downstream_total));

  const totals = {
    total_referrers: referrers.length,
    total_sent: invites.length,
    total_accepted: invites.filter((i) => i.accepted_at).length,
    total_paid: invites.filter((i) => i.is_paid).length,
  };

  return NextResponse.json({ referrers, totals });
}
