// app/api/og/profile/[username]/route.tsx
// Generates a 1200×630 Open Graph image for a public contractor profile.
// Called by social platforms (Twitter/X, LinkedIn, etc.) when a profile link is shared.
// Also logs each render to og_image_requests for admin analytics.

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const runtime = 'edge';

type Ctx = { params: Promise<{ username: string }> };

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { username } = await ctx.params;
  const db = getDb();

  // Fetch profile data
  const { data: profile } = await db
    .from('profiles')
    .select('display_name, username, bio, avatar_url, contractor_role')
    .eq('username', username)
    .maybeSingle();

  const name = profile?.display_name || profile?.username || username;
  const role = profile?.contractor_role ?? 'Contractor';
  const bio = profile?.bio ?? 'Work.WitUS member';

  // Log this render as a social share signal (fire-and-forget)
  db.from('og_image_requests')
    .insert({ profile_username: username })
    .then(() => {}, () => {});

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1c1008 50%, #0a0a0a 100%)',
          padding: '60px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Amber accent top bar */}
        <div style={{ width: '80px', height: '4px', background: '#d97706', borderRadius: '2px', marginBottom: '40px' }} />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
          <div style={{
            width: '40px', height: '40px', background: '#d97706', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: '22px', fontWeight: 900 }}>W</span>
          </div>
          <span style={{ color: '#d97706', fontSize: '20px', fontWeight: 700 }}>Work.WitUS</span>
        </div>

        {/* Name + role */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ color: '#ffffff', fontSize: '64px', fontWeight: 800, lineHeight: 1.1, marginBottom: '16px' }}>
            {name}
          </div>
          <div style={{ color: '#d97706', fontSize: '24px', fontWeight: 600, marginBottom: '20px', textTransform: 'capitalize' }}>
            {role}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '20px', lineHeight: 1.4, maxWidth: '700px' }}>
            {bio.length > 120 ? bio.slice(0, 117) + '…' : bio}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '40px' }}>
          <span style={{ color: '#6b7280', fontSize: '16px' }}>@{username}</span>
          <span style={{ color: '#4b5563', fontSize: '16px' }}>work.witus.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
