// app/api/contractor/locations/route.ts
// GET: all contact_locations belonging to the current user (across all contacts)
// POST: create a new location; auto-creates a "My Venues" system contact if needed

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Get all contact_locations for contacts owned by this user
  const { data, error } = await db
    .from('contact_locations')
    .select('id, label, address, lat, lng, is_default, contact_id, user_contacts!inner(user_id, name)')
    .eq('user_contacts.user_id', user.id)
    .order('label', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const locations = (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    contact_id: row.contact_id,
    contact_name: (row.user_contacts as unknown as { name: string }).name,
  }));

  return NextResponse.json(locations);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { label, address } = body;

  if (!label?.trim()) return NextResponse.json({ error: 'label is required' }, { status: 400 });

  const db = getDb();

  // Find or create the "My Venues" system contact (contact_type='location')
  const { data: existing } = await db
    .from('user_contacts')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', 'My Venues')
    .eq('contact_type', 'location')
    .maybeSingle();

  let contactId: string;
  if (existing) {
    contactId = existing.id;
  } else {
    const { data: created, error: createErr } = await db
      .from('user_contacts')
      .insert({ user_id: user.id, name: 'My Venues', contact_type: 'location' })
      .select('id')
      .single();
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
    contactId = created.id;
  }

  const { data, error } = await db
    .from('contact_locations')
    .insert({ contact_id: contactId, label: label.trim(), address: address?.trim() ?? null })
    .select('id, label, address, lat, lng, contact_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ...data, contact_name: 'My Venues' }, { status: 201 });
}
