// app/api/contractor/jobs/[id]/notes/route.ts
// GET: list notes for a job (own private + all public)
// POST: create a note on a job

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getJobWithRole } from '@/lib/contractor/job-access';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  const result = await getJobWithRole(db, id, user.id);
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch own notes (public + private) and other users' public notes
  const { data: notes, error } = await db
    .from('job_notes')
    .select('*, profiles:user_id(display_name, username)')
    .eq('job_id', id)
    .or(`user_id.eq.${user.id},is_public.eq.true`)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notes: notes ?? [] });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const db = getDb();

  const result = await getJobWithRole(db, id, user.id);
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: note, error } = await db
    .from('job_notes')
    .insert({
      job_id: id,
      user_id: user.id,
      content: content.trim(),
      is_public: false,
    })
    .select('*, profiles:user_id(display_name, username)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(note, { status: 201 });
}
