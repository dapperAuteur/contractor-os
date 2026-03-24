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
    .select('*')
    .eq('job_id', id)
    .or(`user_id.eq.${user.id},is_public.eq.true`)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach profile info (separate query avoids fragile PostgREST embed through auth.users)
  const userIds = [...new Set((notes ?? []).map((n: { user_id: string }) => n.user_id))];
  const profileMap: Record<string, { display_name: string | null; username: string }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, display_name, username')
      .in('id', userIds);
    for (const p of profiles ?? []) {
      profileMap[p.id] = { display_name: p.display_name, username: p.username };
    }
  }

  const notesWithProfiles = (notes ?? []).map((n: { user_id: string }) => ({
    ...n,
    profiles: profileMap[n.user_id] ?? null,
  }));

  return NextResponse.json({ notes: notesWithProfiles });
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
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach profile info
  const { data: profile } = await db
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({ ...note, profiles: profile }, { status: 201 });
}
