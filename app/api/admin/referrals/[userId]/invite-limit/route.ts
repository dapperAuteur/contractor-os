// app/api/admin/referrals/[userId]/invite-limit/route.ts
// PATCH: Set a user's invite_limit on their profile. Admin only.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await params;
  const { invite_limit } = await request.json();

  if (typeof invite_limit !== 'number' || invite_limit < 0 || invite_limit > 10000) {
    return NextResponse.json({ error: 'invite_limit must be a number between 0 and 10000' }, { status: 400 });
  }

  const db = serviceDb();
  const { data, error } = await db
    .from('profiles')
    .update({ invite_limit })
    .eq('id', userId)
    .select('id, username, invite_limit')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json(data);
}
