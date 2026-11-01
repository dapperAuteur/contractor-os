// app/api/admin/shortlinks/sync/route.ts
// POST: backfill short links for published content missing them

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createShortLink, toSwitchySlug } from '@/lib/switchy';
import { MODULES } from '@/lib/features/modules';
import { requireAdmin } from '@/lib/auth/require-admin';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const type = request.nextUrl.searchParams.get('type') || 'all';
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const db = getDb();
  let created = 0;
  let failed = 0;

  // Blog posts
  if (type === 'all' || type === 'blog') {
    const { data: posts } = await db
      .from('blog_posts')
      .select('id, slug, title, excerpt, cover_image_url, user_id')
      .not('published_at', 'is', null)
      .is('short_link_id', null);

    for (const post of posts || []) {
      const { data: profile } = await db.from('profiles').select('username').eq('id', post.user_id).maybeSingle();
      const username = profile?.username || post.user_id;

      const link = await createShortLink({
        url: `${siteUrl}/blog/${username}/${post.slug}`,
        slug: toSwitchySlug('b', post.slug),
        title: post.title,
        description: post.excerpt || undefined,
        image: post.cover_image_url || undefined,
        tags: ['blog'],
      });

      if (link) {
        await db.from('blog_posts')
          .update({ short_link_id: link.id, short_link_url: link.short_url })
          .eq('id', post.id);
        created++;
      } else {
        failed++;
      }
      await delay(100);
    }
  }

  // Feature pages (static — no DB tracking, uses Switchy 409 as idempotency guard)
  if (type === 'all' || type === 'feature') {
    for (const mod of MODULES) {
      const link = await createShortLink({
        url: `${siteUrl}/features/${mod.slug}`,
        slug: toSwitchySlug('f', mod.slug),
        title: `${mod.name} — Work.WitUS`,
        description: mod.tagline,
        tags: ['feature'],
      });

      if (link) {
        created++;
      }
      // 409/422 = already exists (not a failure)
      await delay(100);
    }
  }

  return NextResponse.json({ created, failed });
}

// GET: return counts of content with/without short links
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = getDb();

  const [blogWith, blogWithout] = await Promise.all([
    db.from('blog_posts').select('id', { count: 'exact', head: true }).not('short_link_id', 'is', null),
    db.from('blog_posts').select('id', { count: 'exact', head: true }).not('published_at', 'is', null).is('short_link_id', null),
  ]);

  // Feature pages don't have DB rows — report total count
  // (actual "with" tracking would need a Switchy list API; approximate with total)
  const featureTotal = MODULES.length;

  return NextResponse.json({
    blog: { with: blogWith.count || 0, without: blogWithout.count || 0 },
    feature: { total: featureTotal },
  });
}
