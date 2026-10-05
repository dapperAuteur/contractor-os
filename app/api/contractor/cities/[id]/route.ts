// app/api/contractor/cities/[id]/route.ts
// GET: city guide detail with entries
// PATCH: update city guide
// DELETE: delete city guide
// POST: add entry to city guide

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { checkReferences, invalidReferenceMessage, ownedIds } from '@/lib/auth/ownership';

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

  const { data: guide } = await db
    .from('city_guides')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!guide) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Must be owner or guide must be shared
  if (guide.user_id !== user.id && !guide.is_shared) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: entries } = await db
    .from('city_guide_entries')
    .select('*')
    .eq('city_guide_id', id)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  // Get venue names for entries with near_venue_id
  // Only the guide owner's own venues are named (an id saved before reference
  // checks existed could be someone else's location).
  const ownedVenues = await ownedIds(db, guide.user_id, 'contact_locations', (entries ?? []).map((e) => e.near_venue_id));
  const venueIds = [...ownedVenues.ids];
  const venueMap: Record<string, string> = {};
  if (venueIds.length > 0) {
    const { data: venues } = await db
      .from('contact_locations')
      .select('id, label')
      .in('id', venueIds);
    for (const v of venues ?? []) {
      venueMap[v.id] = v.label;
    }
  }

  const enrichedEntries = (entries ?? []).map((e) => ({
    ...e,
    near_venue_name: e.near_venue_id ? (venueMap[e.near_venue_id] ?? null) : null,
  }));

  return NextResponse.json({ guide, entries: enrichedEntries });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  // Verify ownership
  const { data: existing } = await db
    .from('city_guides')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const allowed = ['city_name', 'state', 'region', 'is_shared', 'notes'];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k];
  }

  const { data, error } = await db
    .from('city_guides')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  const { error } = await db
    .from('city_guides')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  // Verify guide exists and user owns it
  const { data: guide } = await db
    .from('city_guides')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  if (!guide || guide.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { category, name, address, lat, lng, rating, price_range, notes, url, near_venue_id, is_shared } = body;

  if (!category || !name?.trim()) {
    return NextResponse.json({ error: 'category and name are required' }, { status: 400 });
  }

  // The nearby venue must be one of the caller's own locations.
  const refs = await checkReferences(db, user.id, [{ field: 'near_venue_id', table: 'contact_locations', id: near_venue_id }]);
  if (refs.failed) return NextResponse.json({ error: 'Could not verify references' }, { status: 500 });
  if (!refs.ok) return NextResponse.json({ error: invalidReferenceMessage(refs.invalid) }, { status: 400 });

  const validCategories = ['restaurant', 'hotel', 'grocery', 'gym', 'pharmacy', 'entertainment', 'transport', 'coffee', 'laundry', 'other'];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  const { data, error } = await db
    .from('city_guide_entries')
    .insert({
      city_guide_id: id,
      user_id: user.id,
      category,
      name: name.trim(),
      address: address?.trim() || null,
      lat: lat ?? null,
      lng: lng ?? null,
      rating: rating ?? null,
      price_range: price_range ?? null,
      notes: notes?.trim() || null,
      url: url?.trim() || null,
      near_venue_id: near_venue_id || null,
      is_shared: is_shared ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
