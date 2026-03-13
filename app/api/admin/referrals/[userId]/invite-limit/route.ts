// app/api/admin/referrals/[userId]/invite-limit/route.ts
// PATCH: Set a user's invite_limit on their profile. Admin only.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSessionClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function requireAdmin() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return user;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
