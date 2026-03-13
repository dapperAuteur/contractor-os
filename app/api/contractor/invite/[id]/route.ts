// app/api/contractor/invite/[id]/route.ts
// DELETE: revoke a pending invite (only if not yet accepted)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  // Verify ownership and pending status
  const { data: invite } = await db
    .from('invited_users')
    .select('id, invited_by, accepted_at')
    .eq('id', id)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.invited_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (invite.accepted_at) return NextResponse.json({ error: 'Cannot revoke an accepted invite' }, { status: 400 });

  const { error } = await db.from('invited_users').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ revoked: true });
}
