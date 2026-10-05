// app/api/admin/union-documents/route.ts
// GET: list union_documents with optional ?status= filter (admin only)

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const db = getDb();
  let query = db
    .from('union_documents')
    .select('id, name, union_local, doc_type, is_shared, status, error_msg, page_count, updated_at, created_at, user_id')
    .order('updated_at', { ascending: true });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ documents: data ?? [] });
}
