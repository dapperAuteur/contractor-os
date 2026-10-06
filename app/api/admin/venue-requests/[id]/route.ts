// app/api/admin/venue-requests/[id]/route.ts
// PATCH: Approve or reject a venue change request (admin only).
//   approve + edit   → applies proposed_changes to public_venues
//   approve + delete → sets public_venues.is_active = false
//   reject           → marks request rejected with optional admin_note

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// public_venues columns a change request may set (131_public_venues.sql).
const VENUE_EDITABLE_FIELDS = [
  'name', 'address', 'city', 'state', 'country', 'lat', 'lng',
  'venue_type', 'capacity', 'notes', 'knowledge_base', 'schematics_url',
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Admin check: the shared requireAdmin() rule (ADMIN_EMAIL + two-factor verified).
  // profiles.is_admin was read with the user's own client, and the profiles
  // RLS policy lets a user write their own row, so it proved nothing.
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const { id } = await params;
  const { action, admin_note } = await request.json();

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const db = getDb();

  // Fetch the request
  const { data: changeReq, error: fetchErr } = await db
    .from('venue_change_requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!changeReq) return NextResponse.json({ error: 'Request not found or already reviewed' }, { status: 404 });

  if (action === 'approve') {
    if (changeReq.request_type === 'edit' && changeReq.proposed_changes) {
      // Apply proposed changes to the venue. proposed_changes is user-written
      // JSON (users can insert requests directly), so only descriptive columns
      // are copied: never is_active, created_by, id or timestamps.
      const proposed = (changeReq.proposed_changes ?? {}) as Record<string, unknown>;
      const changes: Record<string, unknown> = {};
      for (const key of VENUE_EDITABLE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(proposed, key)) changes[key] = proposed[key];
      }
      const { error: venueErr } = await db
        .from('public_venues')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', changeReq.venue_id);
      if (venueErr) return NextResponse.json({ error: venueErr.message }, { status: 500 });
    } else if (changeReq.request_type === 'delete') {
      // Soft-delete the venue
      const { error: venueErr } = await db
        .from('public_venues')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', changeReq.venue_id);
      if (venueErr) return NextResponse.json({ error: venueErr.message }, { status: 500 });
    }
  }

  // Update request status
  const { data, error } = await db
    .from('venue_change_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      admin_note: admin_note?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
