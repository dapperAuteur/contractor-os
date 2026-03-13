// app/api/venues/route.ts
// GET:  List all active public venues (searchable by name/city)
// POST: Create a new public venue (authenticated)

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

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  const db = getDb();
  let query = db
    .from('public_venues')
    .select('id, name, address, city, state, country, venue_type, capacity, notes, knowledge_base, schematics_url, created_by, created_at')
    .eq('is_active', true)
    .order('name');

  if (q) {
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, address, city, state, country, lat, lng, venue_type, capacity, notes, knowledge_base, schematics_url } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from('public_venues')
    .insert({
      name: name.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      country: country?.trim() || 'US',
      lat: lat ?? null,
      lng: lng ?? null,
      venue_type: venue_type?.trim() || null,
      capacity: capacity ? Number(capacity) : null,
      notes: notes?.trim() || null,
      knowledge_base: knowledge_base ?? {},
      schematics_url: schematics_url?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
