// app/api/contractor/jobs/[id]/documents/route.ts
// GET: list documents for a job
// POST: add a document (Cloudinary URL)
// DELETE: remove a document (via ?doc_id=)

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

  // Workers see shared docs + their own; owners/listers see all
  let query = db
    .from('job_documents')
    .select('*')
    .eq('job_id', id)
    .order('created_at', { ascending: false });

  if (result.role === 'worker') {
    query = query.or(`user_id.eq.${user.id},is_shared.eq.true`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();
  const { name, url, doc_type, is_shared, file_size, notes, title, doc_category, description, metadata } = body;

  // At minimum, a title or name is required
  const docTitle = (title || name || '').trim();
  if (!docTitle) {
    return NextResponse.json({ error: 'title or name is required' }, { status: 400 });
  }

  // Verify job access (owner, lister, or accepted worker)
  const db = getDb();
  const result = await getJobWithRole(db, id, user.id);
  if (!result) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const { data, error } = await db
    .from('job_documents')
    .insert({
      job_id: id,
      user_id: user.id,
      name: docTitle,
      url: url?.trim() || null,
      doc_type: doc_type ?? 'other',
      doc_category: doc_category ?? null,
      title: docTitle,
      description: description ?? notes ?? null,
      metadata: metadata ?? null,
      is_shared: is_shared ?? false,
      file_size: file_size ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ctx.params; // consume params
  const docId = request.nextUrl.searchParams.get('doc_id');
  if (!docId) return NextResponse.json({ error: 'doc_id is required' }, { status: 400 });

  const db = getDb();
  const { error } = await db
    .from('job_documents')
    .delete()
    .eq('id', docId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
