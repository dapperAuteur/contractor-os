// app/api/admin/invites/[id]/route.ts
// PATCH: update invite fields. DELETE: hard-delete invite.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const PATCHABLE = ['access_type', 'expires_at', 'is_active', 'allowed_modules', 'notes', 'demo_profile', 'is_paid', 'paid_at', 'subscription_tier', 'job_limit'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of PATCHABLE) {
    if (key in body) updates[key] = body[key];
  }

  const db = serviceDb();
  const { data, error } = await db
    .from('invited_users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = serviceDb();
  const { error } = await db.from('invited_users').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
