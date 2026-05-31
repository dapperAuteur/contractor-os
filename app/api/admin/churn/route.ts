// app/api/admin/churn/route.ts
// GET: list at-risk paid users (inactive 14+ days)

import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export interface AtRiskUser {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  subscription_status: string;
  subscription_expires_at: string | null;
  last_active: string | null;
  days_inactive: number;
  top_modules: string[];
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();

  // Get all paid users
  const { data: paidUsers } = await db
    .from('profiles')
    .select('id, email, display_name, username, subscription_status, subscription_expires_at')
    .in('subscription_status', ['monthly', 'lifetime'])
    .order('display_name');

  if (!paidUsers || paidUsers.length === 0) {
    return NextResponse.json({ users: [], summary: { total: 0, at_risk: 0, critical: 0 } });
  }

  const userIds = paidUsers.map((u) => u.id);

  // Get last activity per user from usage_events
  const { data: events } = await db
    .from('usage_events')
    .select('user_id, module, created_at')
    .in('user_id', userIds)
    .eq('user_type', 'real')
    .order('created_at', { ascending: false })
    .limit(5000);

  // Build last-active map and top modules per user
  const lastActive = new Map<string, string>();
  const moduleUsage = new Map<string, Map<string, number>>();

  for (const event of events ?? []) {
    if (!lastActive.has(event.user_id)) {
      lastActive.set(event.user_id, event.created_at);
    }
    if (!moduleUsage.has(event.user_id)) {
      moduleUsage.set(event.user_id, new Map());
    }
    const mods = moduleUsage.get(event.user_id)!;
    mods.set(event.module, (mods.get(event.module) ?? 0) + 1);
  }

  const now = Date.now();

  const atRiskUsers: AtRiskUser[] = paidUsers
    .map((u) => {
      const lastActiveDate = lastActive.get(u.id) ?? null;
      const daysInactive = lastActiveDate
        ? Math.floor((now - new Date(lastActiveDate).getTime()) / 86400000)
        : 999; // Never active = very at-risk

      // Top 3 modules by usage count
      const mods = moduleUsage.get(u.id);
      const topModules = mods
        ? [...mods.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([mod]) => mod)
        : [];

      return {
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        username: u.username,
        subscription_status: u.subscription_status,
        subscription_expires_at: u.subscription_expires_at,
        last_active: lastActiveDate,
        days_inactive: daysInactive,
        top_modules: topModules,
      };
    })
    .filter((u) => u.days_inactive >= 14)
    .sort((a, b) => b.days_inactive - a.days_inactive);

  const summary = {
    total: paidUsers.length,
    at_risk: atRiskUsers.filter((u) => u.days_inactive >= 14 && u.days_inactive < 30).length,
    critical: atRiskUsers.filter((u) => u.days_inactive >= 30).length,
  };

  return NextResponse.json({ users: atRiskUsers, summary });
}
