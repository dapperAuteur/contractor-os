// app/api/admin/union-documents/[id]/route.ts
// PATCH: reset a union_document status (admin only)
// Intended use: reset stuck 'processing' docs to 'error' so users can retry

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { status, error_msg } = body as { status: string; error_msg?: string };

  if (!['error', 'processing', 'ready'].includes(status)) {
    return NextResponse.json({ error: 'status must be error, processing, or ready' }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from('union_documents')
    .update({ status, error_msg: error_msg ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  return NextResponse.json({ document: data });
}
