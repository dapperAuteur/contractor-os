// app/api/admin/invites/[id]/clear-demo/route.ts
// Clears all demo data for an invited user's account.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clearUserData } from '@/lib/demo/seed';
import { requireAdmin } from '@/lib/auth/require-admin';

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = serviceDb();

  const { data: invite, error: fetchErr } = await db
    .from('invited_users')
    .select('user_id, demo_seeded')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (!invite.user_id) return NextResponse.json({ error: 'User has not accepted the invite yet' }, { status: 400 });
  if (!invite.demo_seeded) return NextResponse.json({ error: 'No demo data to clear' }, { status: 400 });

  try {
    await clearUserData(db, invite.user_id);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { error: updateErr } = await db
    .from('invited_users')
    .update({ demo_seeded: false, demo_seeded_at: null, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
