// app/api/contractor/availability/route.ts
// GET: check contractor availability by date range

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
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to date params required' }, { status: 400 });
  }

  const db = getDb();

  // Availability is the lister tool (same role rule as /assignments).
  const { data: profile } = await db
    .from('profiles')
    .select('contractor_role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !['lister', 'union_leader'].includes(profile.contractor_role)) {
    return NextResponse.json({ error: 'Lister role required' }, { status: 403 });
  }

  // Get lister's roster
  const { data: roster } = await db
    .from('user_contacts')
    .select('id, name, linked_user_id, skills, availability_notes')
    .eq('user_id', user.id)
    .eq('is_contractor', true);

  if (!roster || roster.length === 0) {
    return NextResponse.json({ contractors: [] });
  }

  // Get linked user IDs from roster
  const linkedUserIds = roster.map((c) => c.linked_user_id).filter(Boolean) as string[];

  // Find jobs in the date range for linked users
  const busyMap: Record<string, { job_id: string | null; event_name: string | null; start_date: string | null; end_date: string | null }[]> = {};

  if (linkedUserIds.length > 0) {
    // Jobs where the contractor is the user_id (self-created jobs)
    const { data: selfJobs } = await db
      .from('contractor_jobs')
      .select('id, user_id, lister_id, event_name, start_date, end_date')
      .in('user_id', linkedUserIds)
      .gte('end_date', from)
      .lte('start_date', to)
      .not('status', 'in', '("cancelled")');

    for (const j of selfJobs ?? []) {
      if (!busyMap[j.user_id]) busyMap[j.user_id] = [];
      // A roster link is typed in by the lister, so it proves nothing about the
      // contractor's consent: show that they are busy, but name the job only
      // when it is one the lister listed.
      const listed = j.lister_id === user.id;
      busyMap[j.user_id].push({ job_id: listed ? j.id : null, event_name: listed ? j.event_name : null, start_date: j.start_date, end_date: j.end_date });
    }

    // Jobs where the contractor is assigned (accepted)
    const { data: assignedJobs } = await db
      .from('contractor_job_assignments')
      .select('assigned_to, job_id')
      .in('assigned_to', linkedUserIds)
      .eq('status', 'accepted');

    const assignedJobIds = (assignedJobs ?? []).map((a) => a.job_id);
    if (assignedJobIds.length > 0) {
      const { data: jobDetails } = await db
        .from('contractor_jobs')
        .select('id, user_id, lister_id, event_name, start_date, end_date')
        .in('id', assignedJobIds)
        .gte('end_date', from)
        .lte('start_date', to)
        .not('status', 'in', '("cancelled")');

      for (const a of assignedJobs ?? []) {
        const job = (jobDetails ?? []).find((j) => j.id === a.job_id);
        if (job) {
          if (!busyMap[a.assigned_to]) busyMap[a.assigned_to] = [];
          const mine = job.user_id === user.id || job.lister_id === user.id;
          busyMap[a.assigned_to].push({ job_id: mine ? job.id : null, event_name: mine ? job.event_name : null, start_date: job.start_date, end_date: job.end_date });
        }
      }
    }
  }

  // Get usernames for linked users
  const usernameMap: Record<string, string> = {};
  if (linkedUserIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, username')
      .in('id', linkedUserIds);
    for (const p of profiles ?? []) usernameMap[p.id] = p.username ?? 'Anonymous';
  }

  const contractors = roster.map((c) => ({
    contact_id: c.id,
    name: c.name,
    linked_user_id: c.linked_user_id,
    username: c.linked_user_id ? (usernameMap[c.linked_user_id] ?? null) : null,
    skills: c.skills,
    availability_notes: c.availability_notes,
    busy_dates: c.linked_user_id ? (busyMap[c.linked_user_id] ?? []) : [],
    available: c.linked_user_id ? !(busyMap[c.linked_user_id]?.length) : null,
  }));

  return NextResponse.json({ contractors });
}
