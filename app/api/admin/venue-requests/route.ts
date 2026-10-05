// app/api/admin/venue-requests/route.ts
// GET: List venue change requests (admin only), filterable by status

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin check: the same ADMIN_EMAIL rule every other admin route uses.
  // profiles.is_admin was read with the user's own client, and the profiles
  // RLS policy lets a user write their own row, so it proved nothing.
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
