// app/api/contractor/venues/route.ts
// GET: list contact_locations used in contractor jobs (venue directory)
// PATCH: update knowledge_base / schematics_url on a location

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { checkOwned, ownedIds } from '@/lib/auth/ownership';

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

  // Get all locations linked to this user's jobs
  const { data: jobs } = await db
    .from('contractor_jobs')
    .select('location_id, location_name')
    .eq('user_id', user.id)
    .not('location_id', 'is', null);

  // Only the caller's own locations: a job's location_id saved before reference
  // checks existed could name another user's venue.
  const owned = await ownedIds(db, user.id, 'contact_locations', (jobs ?? []).map((j) => j.location_id));
  if (owned.failed) return NextResponse.json({ error: 'Could not load venues' }, { status: 500 });
  const locationIds = [...owned.ids];

  if (locationIds.length === 0) {
    return NextResponse.json({ venues: [] });
  }

  const { data: venues, error } = await db
    .from('contact_locations')
    .select('id, contact_id, label, address, lat, lng, notes, schematics_url, knowledge_base')
    .in('id', locationIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count jobs per venue
  const jobCounts: Record<string, number> = {};
  for (const j of jobs ?? []) {
    if (j.location_id) {
      jobCounts[j.location_id] = (jobCounts[j.location_id] || 0) + 1;
    }
  }

  const enriched = (venues ?? []).map((v) => ({
    ...v,
    job_count: jobCounts[v.id] ?? 0,
  }));

  return NextResponse.json({ venues: enriched });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const body = await request.json();
  const { location_id, knowledge_base, schematics_url } = body;

  if (!location_id) {
    return NextResponse.json({ error: 'location_id required' }, { status: 400 });
  }

  // The venue must be the caller's own location (not found otherwise)...
  const owned = await checkOwned(db, user.id, 'contact_locations', location_id);
  if (owned.failed) return NextResponse.json({ error: 'Could not verify venue' }, { status: 500 });
  if (!owned.allowed) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

  // ...and the user must have a job at it
  const { data: jobLink } = await db
    .from('contractor_jobs')
    .select('id')
    .eq('user_id', user.id)
    .eq('location_id', location_id)
    .limit(1)
    .maybeSingle();

  if (!jobLink) {
    return NextResponse.json({ error: 'No jobs at this venue' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (knowledge_base !== undefined) updates.knowledge_base = knowledge_base;
  if (schematics_url !== undefined) updates.schematics_url = schematics_url;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await db
    .from('contact_locations')
    .update(updates)
    .eq('id', location_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
