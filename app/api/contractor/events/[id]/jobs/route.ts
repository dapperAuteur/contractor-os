// app/api/contractor/events/[id]/jobs/route.ts
// POST: create a job pre-filled from event fields

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();
  const db = getDb();

  // Fetch event
  const { data: event, error: eventError } = await db
    .from('contractor_events')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Job number is required
  const jobNumber = body.job_number;
  if (!jobNumber) {
    return NextResponse.json({ error: 'job_number is required' }, { status: 400 });
  }

  // Build job from event fields, allowing overrides from body
  const jobData: Record<string, unknown> = {
    user_id: user.id,
    event_id: id,
    event_name: event.name,
    client_id: event.client_id,
    client_name: event.client_name,
    location_id: event.location_id,
    location_name: event.location_name,
    poc_contact_id: event.poc_contact_id,
    poc_name: event.poc_name,
    poc_phone: event.poc_phone,
    crew_coordinator_id: event.crew_coordinator_id,
    crew_coordinator_name: event.crew_coordinator_name,
    crew_coordinator_phone: event.crew_coordinator_phone,
    start_date: event.start_date,
    end_date: event.end_date,
    union_local: event.union_local,
    department: event.department,
    brand_id: event.brand_id,
    pay_rate: event.pay_rate,
    ot_rate: event.ot_rate,
    dt_rate: event.dt_rate,
    rate_type: event.rate_type,
    benefits_eligible: event.benefits_eligible,
    travel_benefits: event.travel_benefits,
    notes: event.notes,
  };

  // Apply overrides from request body
  const OVERRIDE_FIELDS = [
    'job_number', 'client_name', 'event_name', 'location_name',
    'poc_name', 'poc_phone', 'crew_coordinator_name', 'crew_coordinator_phone',
    'start_date', 'end_date', 'is_multi_day', 'scheduled_dates',
    'pay_rate', 'ot_rate', 'dt_rate', 'rate_type',
    'status', 'notes', 'metadata',
    'is_lister_job', 'lister_id',
  ];
  for (const key of OVERRIDE_FIELDS) {
    if (key in body) jobData[key] = body[key];
  }

  const { data: job, error: jobError } = await db
    .from('contractor_jobs')
    .insert(jobData)
    .select()
    .single();

  if (jobError) {
    if (jobError.code === '23505') {
      return NextResponse.json(
        { error: `Job number "${jobNumber}" already exists` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  // If assigned_to is provided, create a job assignment (lister flow)
  if (body.assigned_to) {
    await db.from('contractor_job_assignments').insert({
      job_id: job.id,
      assigned_by: user.id,
      assigned_to: body.assigned_to,
      status: 'offered',
      message: body.assignment_message || null,
    });
  }

  return NextResponse.json(job, { status: 201 });
}
