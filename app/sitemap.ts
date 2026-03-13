// app/sitemap.ts
// Dynamic sitemap for Work.WitUS.
// Includes static marketing pages + dynamic profiles, blog posts, and academy courses.

import { MetadataRoute } from 'next';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://work.witus.com';

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // ── Static routes ──────────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,                                  lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/pricing`,                     lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/features/contractor`,         lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/features/lister`,             lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/lister-landing`,              lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/lister-pricing`,              lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/academy`,                     lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/blog`,                        lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${SITE_URL}/community`,                   lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${SITE_URL}/privacy`,                     lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/terms`,                       lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/safety`,                      lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];

  const supabase = db();

  // ── Dynamic: public profiles ───────────────────────────────────────────────
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .not('username', 'is', null)
    .limit(5000);

  const profileRoutes: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
    url: `${SITE_URL}/profiles/${p.username}`,
    lastModified: p.updated_at ?? now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // ── Dynamic: public blog posts ─────────────────────────────────────────────
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, user_id, published_at, updated_at, profiles!inner(username)')
    .eq('visibility', 'public')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(5000);

  const blogRoutes: MetadataRoute.Sitemap = (posts ?? []).map((p) => {
    const username = (p.profiles as unknown as { username: string })?.username;
    return {
      url: `${SITE_URL}/blog/${username}/${p.slug}`,
      lastModified: p.updated_at ?? p.published_at ?? now,
      changeFrequency: 'monthly',
      priority: 0.9,
    };
  });

  // ── Dynamic: academy courses ───────────────────────────────────────────────
  const { data: courses } = await supabase
    .from('courses')
    .select('id, updated_at')
    .eq('status', 'published')
    .limit(2000);

  const courseRoutes: MetadataRoute.Sitemap = (courses ?? []).map((c) => ({
    url: `${SITE_URL}/academy/${c.id}`,
    lastModified: c.updated_at ?? now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...profileRoutes, ...blogRoutes, ...courseRoutes];
}
