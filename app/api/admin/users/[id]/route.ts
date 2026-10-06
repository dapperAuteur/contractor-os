// app/api/admin/users/[id]/route.ts
// Admin: get user detail, update subscription/promo code, retry Shopify promo

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createShopifyPromoCode } from '@/lib/shopify/createPromoCode';
import { requireAdmin } from '@/lib/auth/require-admin';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = getServiceClient();

  const [profileRes, authUserRes, focusRes, recipesRes, blogRes] = await Promise.all([
    db.from('profiles').select('*').eq('id', id).single(),
    db.auth.admin.getUserById(id),
    db.from('focus_sessions').select('id', { count: 'exact' }).eq('user_id', id),
    db.from('recipes').select('id', { count: 'exact' }).eq('user_id', id),
    db.from('blog_posts').select('id', { count: 'exact' }).eq('user_id', id),
  ]);

  return NextResponse.json({
    profile: profileRes.data,
    email: authUserRes.data.user?.email ?? null,
    stats: {
      focusSessions: focusRes.count ?? 0,
      recipes: recipesRes.count ?? 0,
      blogPosts: blogRes.count ?? 0,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const allowed = ['shirt_promo_code', 'subscription_status'];
  const updates: Record<string, string> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const db = getServiceClient();
  const { error } = await db.from('profiles').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const url = new URL(request.url);
  if (!url.pathname.endsWith('/retry-promo')) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
  }

  let code: string;
  try {
    code = await createShopifyPromoCode();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Shopify API failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const db = getServiceClient();
  const { error } = await db.from('profiles').update({ shirt_promo_code: code }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ code });
}
