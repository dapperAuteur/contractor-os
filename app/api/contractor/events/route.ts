// app/api/contractor/events/route.ts
// GET: list events for the current user
// POST: create an event

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { checkReferences, invalidReferenceMessage } from '@/lib/auth/ownership';
import { jobReferences } from '@/lib/contractor/job-fields';

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

  const db = getDb();
  const url = request.nextUrl;
  const clientId = url.searchParams.get('client_id');
  const brandId = url.searchParams.get('brand_id');
  const startAfter = url.searchParams.get('start_after');
  const startBefore = url.searchParams.get('start_before');

  let query = db
    .from('contractor_events')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false, nullsFirst: false });

  if (clientId) query = query.eq('client_id', clientId);
  if (brandId) query = query.eq('brand_id', brandId);
  if (startAfter) query = query.gte('start_date', startAfter);
  if (startBefore) query = query.lte('start_date', startBefore);

  const { data: events, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch job counts for each event
  const eventIds = (events ?? []).map((e) => e.id);
  const jobCounts: Record<string, number> = {};
  if (eventIds.length > 0) {
    const { data: counts } = await db
      .from('contractor_jobs')
      .select('event_id')
      .in('event_id', eventIds)
      .or(`user_id.eq.${user.id},lister_id.eq.${user.id}`);
    if (counts) {
      for (const row of counts) {
        jobCounts[row.event_id] = (jobCounts[row.event_id] || 0) + 1;
      }
    }
  }

  const eventsWithCounts = (events ?? []).map((e) => ({
    ...e,
    _counts: { jobs: jobCounts[e.id] || 0 },
  }));

  return NextResponse.json({ events: eventsWithCounts });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
  }

  const db = getDb();

  const FIELDS = [
    'name', 'client_id', 'client_name', 'location_id', 'location_name',
    'poc_contact_id', 'poc_name', 'poc_phone',
    'crew_coordinator_id', 'crew_coordinator_name', 'crew_coordinator_phone',
    'start_date', 'end_date', 'union_local', 'department', 'brand_id',
    'pay_rate', 'ot_rate', 'dt_rate', 'rate_type',
    'benefits_eligible', 'travel_benefits', 'notes', 'metadata',
  ];

  const insert: Record<string, unknown> = { user_id: user.id };
  for (const key of FIELDS) {
    if (key in body) insert[key] = body[key];
  }

  // Client, contacts, venue and brand must be the caller's own.
  const refs = await checkReferences(db, user.id, jobReferences(insert));
  if (refs.failed) return NextResponse.json({ error: 'Could not verify references' }, { status: 500 });
  if (!refs.ok) return NextResponse.json({ error: invalidReferenceMessage(refs.invalid) }, { status: 400 });

  const { data: event, error } = await db
    .from('contractor_events')
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(event, { status: 201 });
}
