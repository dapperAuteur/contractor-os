// app/api/admin/banners/route.ts
// GET: list all banners | POST: create banner

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const { data, error } = await db
    .from('marketing_banners')
    .select('*')
    .eq('app', 'contractor')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { title, body: bannerBody, cta_text, cta_url, target_tiers, starts_at, ends_at } = body;

  if (!title || !bannerBody) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from('marketing_banners')
    .insert({
      app: 'contractor',
      title,
      body: bannerBody,
      cta_text: cta_text || 'Upgrade',
      cta_url: cta_url || '/pricing',
      target_tiers: target_tiers || ['free'],
      starts_at: starts_at || null,
      ends_at: ends_at || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
