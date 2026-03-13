// app/api/venues/[id]/request/route.ts
// POST: Submit an edit or delete change request for a public venue.
//       All changes (including by the original creator) go through admin approval.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { request_type, proposed_changes, reason } = body;

  if (!['edit', 'delete'].includes(request_type)) {
    return NextResponse.json({ error: 'request_type must be edit or delete' }, { status: 400 });
  }
  if (request_type === 'edit' && !proposed_changes) {
    return NextResponse.json({ error: 'proposed_changes is required for edit requests' }, { status: 400 });
  }

  const db = getDb();

  // Verify venue exists
  const { data: venue } = await db
    .from('public_venues')
    .select('id')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

  const { data, error } = await db
    .from('venue_change_requests')
    .insert({
      venue_id: id,
      user_id: user.id,
      request_type,
      proposed_changes: request_type === 'edit' ? proposed_changes : null,
      reason: reason?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
