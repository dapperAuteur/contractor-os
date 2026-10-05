// app/api/admin/venue-requests/route.ts
// GET: List venue change requests (admin only), filterable by status

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  // Admin check: the shared requireAdmin() rule (ADMIN_EMAIL + two-factor verified).
  // profiles.is_admin was read with the user's own client, and the profiles
  // RLS policy lets a user write their own row, so it proved nothing.
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'pending';

  const db = getDb();
  const { data, error } = await db
    .from('venue_change_requests')
    .select(`
      id, request_type, proposed_changes, reason, status, admin_note, created_at,
      venue_id,
      public_venues ( id, name, city, state, venue_type ),
      profiles!venue_change_requests_user_id_fkey ( id, username, full_name )
    `)
    .eq('status', status)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}
