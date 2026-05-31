// app/api/admin/funnels/route.ts
// GET: conversion funnel analytics — Signup → Profile → First Job → First Invoice → Subscribed → Retained 90d

import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export interface FunnelStage {
  name: string;
  count: number;
  dropoff_pct: number;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

  // Run all counts in parallel
  const [
    totalUsersRes,
    profileCompleteRes,
    hasJobRes,
    hasInvoiceRes,
    subscribedRes,
    retained90Res,
  ] = await Promise.all([
    // 1. Signed up (all profiles)
    db.from('profiles').select('id', { count: 'exact', head: true }),

    // 2. Profile complete (has display_name AND username)
    db.from('profiles').select('id', { count: 'exact', head: true })
      .not('display_name', 'is', null)
      .not('username', 'is', null)
      .neq('display_name', ''),

    // 3. Created first job (distinct users)
    db.from('contractor_jobs').select('user_id').limit(10000),

    // 4. Created first invoice (distinct users)
    db.from('invoices').select('user_id').limit(10000),

    // 5. Subscribed (monthly or lifetime)
    db.from('profiles').select('id', { count: 'exact', head: true })
      .in('subscription_status', ['monthly', 'lifetime']),

    // 6. Retained 90 days (subscribed AND had activity in last 90 days)
    db.from('usage_events').select('user_id', { count: 'exact', head: true })
      .eq('user_type', 'real')
      .gte('created_at', ninetyDaysAgo),
  ]);

  // Count distinct users who created jobs / invoices
  const hasJobCount = new Set((hasJobRes.data ?? []).map((j: { user_id: string }) => j.user_id)).size;
  const hasInvoiceCount = new Set((hasInvoiceRes.data ?? []).map((i: { user_id: string }) => i.user_id)).size;

  // Build retained count — distinct users with activity in last 90 days who are subscribed
  let retainedCount = 0;
  if (retained90Res.count !== null && retained90Res.count !== undefined) {
    // Get distinct active user IDs in last 90 days
    const { data: activeUsers } = await db
      .from('usage_events')
      .select('user_id')
      .eq('user_type', 'real')
      .gte('created_at', ninetyDaysAgo)
      .limit(10000);
    const activeIds = [...new Set((activeUsers ?? []).map(u => u.user_id).filter(Boolean))];

    if (activeIds.length > 0) {
      const { count } = await db
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('id', activeIds)
        .in('subscription_status', ['monthly', 'lifetime']);
      retainedCount = count ?? 0;
    }
  }

  const counts = [
    totalUsersRes.count ?? 0,
    profileCompleteRes.count ?? 0,
    hasJobCount,
    hasInvoiceCount,
    subscribedRes.count ?? 0,
    retainedCount,
  ];

  const stageNames = [
    'Signed Up',
    'Profile Complete',
    'First Job Created',
    'First Invoice',
    'Subscribed',
    'Retained 90d',
  ];

  const stages: FunnelStage[] = stageNames.map((name, i) => {
    const count = counts[i];
    const prev = i === 0 ? count : counts[i - 1];
    const dropoff_pct = prev > 0 ? Math.round(((prev - count) / prev) * 100) : 0;
    return { name, count, dropoff_pct };
  });

  return NextResponse.json({ stages });
}
