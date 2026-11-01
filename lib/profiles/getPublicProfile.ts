// lib/profiles/getPublicProfile.ts
// Shared helper that fetches all public profile data for a given username.
// Used by both the /profiles/[username] page (SSR) and the API route.
//
// Work.WitUS data only. Badges, recipes, health-metric streaks and travel stats are
// CentenarianOS data, and completed courses, learning paths and teacher listings came from
// the Academy tables (now on Learn.WitUS); all were removed in plan 18 Phase 1.

import { createClient } from '@supabase/supabase-js';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  tags: string[];
  like_count: number;
}

export interface ProfileResponse {
  profile: ProfileData;
  stats: {
    blog_posts: number;
  };
  blog_posts: BlogPost[];
}

// ─── Main function ───────────────────────────────────────────────────────────

export async function getPublicProfile(username: string): Promise<ProfileResponse | null> {
  const db = getDb();

  // 1. Look up profile by username
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, created_at, role')
    .eq('username', username)
    .maybeSingle();

  if (profileError || !profile) return null;

  const userId = profile.id;

  // 2. Public blog posts
  const [blogRes, blogCountRes] = await Promise.all([
    // Published blog posts (latest 10 for display)
    db
      .from('blog_posts')
      .select('id, title, slug, excerpt, published_at, tags, like_count')
      .eq('user_id', userId)
      .eq('visibility', 'public')
      .order('published_at', { ascending: false })
      .limit(10),

    // Total blog post count
    db
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('visibility', 'public'),
  ]);

  // 3. Compose response
  return {
    profile: profile as ProfileData,
    stats: {
      blog_posts: blogCountRes.count ?? (blogRes.data || []).length,
    },
    blog_posts: (blogRes.data || []) as BlogPost[],
  };
}
