// app/api/contractor/events/[id]/route.ts
// GET: event detail with linked jobs and aggregate stats
// PATCH: update event fields, optionally propagate to linked jobs
// DELETE: unlink jobs and delete event

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { checkOwned, checkReferences, invalidReferenceMessage } from '@/lib/auth/ownership';
import { jobReferences } from '@/lib/contractor/job-fields';

// Jobs an event may read or change: the caller's own, or ones they list. Another
// user's job can carry this event_id (a lister links it), and must not be touched.
const mineOrListed = (userId: string) => `user_id.eq.${userId},lister_id.eq.${userId}`;

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

  const { data: event, error } = await db
    .from('contractor_events')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Fetch linked jobs with summary data
  const { data: jobs } = await db
    .from('contractor_jobs')
    .select('id, job_number, client_name, status, start_date, end_date, pay_rate, event_name')
    .eq('event_id', id)
    .or(mineOrListed(user.id))
    .order('start_date', { ascending: true });

  // Aggregate stats from linked jobs
  const jobIds = (jobs ?? []).map((j) => j.id);
  let totalHours = 0;
  let totalInvoiced = 0;

  if (jobIds.length > 0) {
    const [timeRes, invoiceRes] = await Promise.all([
      db.from('job_time_entries')
        .select('total_hours')
        .in('job_id', jobIds),
      db.from('invoices')
        .select('total')
        .in('job_id', jobIds),
    ]);

    totalHours = (timeRes.data ?? []).reduce((s, e) => s + (Number(e.total_hours) || 0), 0);
    totalInvoiced = (invoiceRes.data ?? []).reduce((s, i) => s + (Number(i.total) || 0), 0);
  }

  return NextResponse.json({
    ...event,
    _jobs: jobs ?? [],
    _stats: {
      total_jobs: (jobs ?? []).length,
      total_hours: Math.round(totalHours * 100) / 100,
      total_invoiced: Math.round(totalInvoiced * 100) / 100,
    },
  });
}

const ALLOWED_FIELDS = [
  'name', 'client_id', 'client_name', 'location_id', 'location_name',
  'poc_contact_id', 'poc_name', 'poc_phone',
  'crew_coordinator_id', 'crew_coordinator_name', 'crew_coordinator_phone',
  'start_date', 'end_date', 'union_local', 'department', 'brand_id',
  'pay_rate', 'ot_rate', 'dt_rate', 'rate_type',
  'benefits_eligible', 'travel_benefits', 'notes', 'metadata',
];

// Fields that can propagate from event to linked jobs
const PROPAGABLE_FIELDS = [
  'client_id', 'client_name', 'location_id', 'location_name',
  'poc_contact_id', 'poc_name', 'poc_phone',
  'crew_coordinator_id', 'crew_coordinator_name', 'crew_coordinator_phone',
  'union_local', 'department', 'brand_id',
  'pay_rate', 'ot_rate', 'dt_rate', 'rate_type',
  'benefits_eligible', 'travel_benefits',
];

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json();
  const { propagate } = body;

  const db = getDb();

  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0 && !propagate) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Client, contacts, venue and brand must be the caller's own.
  const refs = await checkReferences(db, user.id, jobReferences(updates));
  if (refs.failed) return NextResponse.json({ error: 'Could not verify references' }, { status: 500 });
  if (!refs.ok) return NextResponse.json({ error: invalidReferenceMessage(refs.invalid) }, { status: 400 });

  // Update the event
  let event;
  if (Object.keys(updates).length > 0) {
    const { data, error } = await db
      .from('contractor_events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    event = data;
  } else {
    const { data } = await db
      .from('contractor_events')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    event = data;
  }

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Count linked jobs
  const { count: linkedJobCount } = await db
    .from('contractor_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id)
    .or(mineOrListed(user.id));

  // Propagate changes to linked jobs if requested
  let propagatedCount = 0;
  if (propagate && (linkedJobCount ?? 0) > 0) {
    const jobUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of PROPAGABLE_FIELDS) {
      if (key in updates) jobUpdates[key] = updates[key];
    }
    // Also set event_name from event.name
    if ('name' in updates) jobUpdates.event_name = updates.name;

    if (Object.keys(jobUpdates).length > 1) { // more than just updated_at
      const { data: updatedJobs } = await db
        .from('contractor_jobs')
        .update(jobUpdates)
        .eq('event_id', id)
        .or(mineOrListed(user.id))
        .select('id');
      propagatedCount = updatedJobs?.length ?? 0;
    }
  }

  return NextResponse.json({
    ...event,
    _linked_jobs: linkedJobCount ?? 0,
    _propagated: propagatedCount,
  });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  // Ownership first: the unlink below is keyed on the event id.
  const owned = await checkOwned(db, user.id, 'contractor_events', id);
  if (owned.failed) return NextResponse.json({ error: 'Could not verify ownership' }, { status: 500 });
  if (!owned.allowed) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Unlink all jobs from this event (the FK is ON DELETE SET NULL as well)
  await db
    .from('contractor_jobs')
    .update({ event_id: null, updated_at: new Date().toISOString() })
    .eq('event_id', id);

  // Delete the event
  const { error } = await db
    .from('contractor_events')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
