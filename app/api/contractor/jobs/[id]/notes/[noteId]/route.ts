// app/api/contractor/jobs/[id]/notes/[noteId]/route.ts
// PATCH: update note content or toggle is_public
// DELETE: remove a note

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Ctx = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, noteId } = await ctx.params;
  const body = await request.json();
  const db = getDb();

  // Verify ownership
  const { data: note } = await db
    .from('job_notes')
    .select('id, user_id')
    .eq('id', noteId)
    .eq('job_id', id)
    .maybeSingle();

  if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  if (note.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const updates: Record<string, unknown> = {};
  if ('content' in body && typeof body.content === 'string') {
    updates.content = body.content.trim();
  }
  if ('is_public' in body && typeof body.is_public === 'boolean') {
    updates.is_public = body.is_public;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: updated, error } = await db
    .from('job_notes')
    .update(updates)
    .eq('id', noteId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach profile info
  const { data: profile } = await db
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({ ...updated, profiles: profile });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, noteId } = await ctx.params;
  const db = getDb();

  // Verify ownership
  const { data: note } = await db
    .from('job_notes')
    .select('id, user_id')
    .eq('id', noteId)
    .eq('job_id', id)
    .maybeSingle();

  if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  if (note.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await db
    .from('job_notes')
    .delete()
    .eq('id', noteId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
