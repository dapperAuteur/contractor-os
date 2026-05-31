// app/api/contractor/union/documents/[id]/route.ts
// PATCH: update document metadata (name, union_local, doc_type, is_shared)
// DELETE: delete document and its chunks

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { fireOutboxDrafts } from '@/lib/outbox-trigger';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  const { data: doc } = await db
    .from('union_documents')
    .select('user_id, is_shared, union_local')
    .eq('id', id)
    .maybeSingle();

  if (!doc || doc.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const allowed = ['name', 'union_local', 'doc_type', 'is_shared'];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k];
  }

  const { data, error } = await db
    .from('union_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire outbox draft only when the document transitions from private to shared.
  // Plain metadata edits to an already-shared doc don't fire; an already-public
  // resource changing its name isn't a publishable moment.
  const wentPublic = data.is_shared === true && doc.is_shared !== true;
  if (wentPublic) {
    const localTag = data.union_local ? ` for ${data.union_local}` : '';
    fireOutboxDrafts({
      triggerUserId: user.id,
      externalRefBase: `union-doc-shared-${data.id}`,
      caption: `Union resource just went public${localTag} on Work.WitUS. Searchable by every crew member in the local. https://work.witus.online`,
      platforms: ['linkedin', 'twitter', 'bluesky'],
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  // Cascade deletes chunks via FK
  const { error } = await db
    .from('union_documents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
