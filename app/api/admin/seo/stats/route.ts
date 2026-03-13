// app/api/admin/seo/stats/route.ts
// Admin-only endpoint returning SEO & social performance metrics.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const now = new Date();
  const d7  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // ── OG image renders ───────────────────────────────────────────────────────
  const [
    { count: ogTotal },
    { count: og7d },
    { count: og30d },
    { data: topProfiles },
  ] = await Promise.all([
    db.from('og_image_requests').select('id', { count: 'exact', head: true }).eq('app', 'workwitus'),
    db.from('og_image_requests').select('id', { count: 'exact', head: true }).eq('app', 'workwitus').gte('created_at', d7),
    db.from('og_image_requests').select('id', { count: 'exact', head: true }).eq('app', 'workwitus').gte('created_at', d30),
    db.from('og_image_requests')
      .select('profile_username')
      .eq('app', 'workwitus')
      .order('created_at', { ascending: false })
      .limit(5000),
  ]);

  // Aggregate top profiles in JS (supabase doesn't support GROUP BY easily via client)
  const profileCounts: Record<string, { count: number; last_seen: string }> = {};
  for (const row of topProfiles ?? []) {
    if (!profileCounts[row.profile_username]) {
      profileCounts[row.profile_username] = { count: 0, last_seen: '' };
    }
    profileCounts[row.profile_username].count++;
  }

  const topSharedProfiles = Object.entries(profileCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([username, data]) => ({ username, og_renders: data.count }));

  // ── Social referrals ───────────────────────────────────────────────────────
  const [
    { count: refTotal },
    { count: ref7d },
    { count: ref30d },
    { data: referralRows },
    { data: recentReferrals },
  ] = await Promise.all([
    db.from('social_referrals').select('id', { count: 'exact', head: true }).eq('app', 'workwitus'),
    db.from('social_referrals').select('id', { count: 'exact', head: true }).eq('app', 'workwitus').gte('created_at', d7),
    db.from('social_referrals').select('id', { count: 'exact', head: true }).eq('app', 'workwitus').gte('created_at', d30),
    db.from('social_referrals').select('source').eq('app', 'workwitus').limit(5000),
    db.from('social_referrals')
      .select('source, path, created_at')
      .eq('app', 'workwitus')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const bySource: Record<string, number> = {};
  for (const row of referralRows ?? []) {
    bySource[row.source] = (bySource[row.source] ?? 0) + 1;
  }

  // ── Sitemap coverage counts ────────────────────────────────────────────────
  const [
    { count: profileCount },
    { count: blogCount },
    { count: courseCount },
  ] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).not('username', 'is', null),
    db.from('blog_posts').select('id', { count: 'exact', head: true }).eq('visibility', 'public').not('published_at', 'is', null),
    db.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ]);

  const STATIC_PAGE_COUNT = 12; // matches static routes in sitemap.ts

  return NextResponse.json({
    og_renders: {
      total: ogTotal ?? 0,
      last_7d: og7d ?? 0,
      last_30d: og30d ?? 0,
      top_profiles: topSharedProfiles,
    },
    social_referrals: {
      total: refTotal ?? 0,
      last_7d: ref7d ?? 0,
      last_30d: ref30d ?? 0,
      by_source: bySource,
      recent: recentReferrals ?? [],
    },
    sitemap_coverage: {
      profiles: profileCount ?? 0,
      blog_posts: blogCount ?? 0,
      courses: courseCount ?? 0,
      static_pages: STATIC_PAGE_COUNT,
      total: (profileCount ?? 0) + (blogCount ?? 0) + (courseCount ?? 0) + STATIC_PAGE_COUNT,
    },
  });
}
