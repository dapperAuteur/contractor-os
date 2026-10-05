// app/api/admin/users/route.ts
// Returns all users for admin panel

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = getServiceClient();

  // Get all profiles
  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, username, display_name, subscription_status, shirt_promo_code, stripe_customer_id, subscription_expires_at, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get auth user emails via admin API
  const { data: authUsers } = await db.auth.admin.listUsers({ perPage: 1000 });

  const emailMap = new Map(authUsers?.users?.map((u) => [u.id, u.email]) ?? []);

  const users = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap.get(p.id) ?? null,
  }));

  return NextResponse.json({ users });
}
