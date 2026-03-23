// app/api/contractor/jobs/[id]/crew/route.ts
// GET: list all contacts linked to this job via contact_job_roles
// POST: add a contact to this job's crew sheet

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Verify job ownership
  const { data: job } = await db
    .from('contractor_jobs')
    .select('user_id')
    .eq('id', jobId)
    .maybeSingle();
  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await db
    .from('contact_job_roles')
    .select(`
      id, role, role_label, notes, created_at,
      user_contacts(id, name, job_title, company_name, phone, email,
        contact_phones(id, phone, label, is_primary),
        contact_emails(id, email, label, is_primary)
      )
    `)
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ crew: data ?? [] });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Verify job ownership
  const { data: job } = await db
    .from('contractor_jobs')
    .select('user_id, event_id, start_date, client_name')
    .eq('id', jobId)
    .maybeSingle();
  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { contact_id, role, role_label, notes } = body;

  if (!contact_id) return NextResponse.json({ error: 'contact_id is required' }, { status: 400 });
  if (!role) return NextResponse.json({ error: 'role is required' }, { status: 400 });

  // Verify contact ownership
  const { data: contact } = await db
    .from('user_contacts')
    .select('user_id')
    .eq('id', contact_id)
    .maybeSingle();
  if (!contact || contact.user_id !== user.id) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const { data: roleData, error } = await db
    .from('contact_job_roles')
    .upsert(
      {
        contact_id,
        job_id: jobId,
        event_id: job.event_id ?? null,
        role,
        role_label: role_label?.trim() ?? null,
        notes: notes?.trim() ?? null,
      },
      { onConflict: 'contact_id,job_id,role' },
    )
    .select(`
      id, role, role_label, notes, created_at,
      user_contacts(id, name, job_title, company_name, phone, email,
        contact_phones(id, phone, label, is_primary),
        contact_emails(id, email, label, is_primary)
      )
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-capture: update denormalized fields on user_contacts
  const updates: Record<string, unknown> = {};

  if (job.start_date) {
    const { data: current } = await db
      .from('user_contacts')
      .select('last_worked_with')
      .eq('id', contact_id)
      .single();

    if (current && (!current.last_worked_with || job.start_date > current.last_worked_with)) {
      updates.last_worked_with = job.start_date;
    }
  }

  // Count distinct jobs
  const { count } = await db
    .from('contact_job_roles')
    .select('job_id', { count: 'exact', head: true })
    .eq('contact_id', contact_id);

  if (count !== null) updates.total_jobs_together = count;

  // Auto-add company tag
  if (job.client_name) {
    await db.from('contact_tags').upsert(
      { contact_id, tag_type: 'company', value: job.client_name },
      { onConflict: 'contact_id,tag_type,value' },
    );
  }

  if (Object.keys(updates).length > 0) {
    await db.from('user_contacts').update(updates).eq('id', contact_id);
  }

  return NextResponse.json({ crew_member: roleData }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id: jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Verify job ownership
  const { data: job } = await db
    .from('contractor_jobs')
    .select('user_id')
    .eq('id', jobId)
    .maybeSingle();
  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const roleId = request.nextUrl.searchParams.get('role_id');
  if (!roleId) return NextResponse.json({ error: 'role_id query param required' }, { status: 400 });

  // Get contact_id before deleting for recount
  const { data: roleRow } = await db
    .from('contact_job_roles')
    .select('contact_id')
    .eq('id', roleId)
    .eq('job_id', jobId)
    .maybeSingle();

  const { error } = await db.from('contact_job_roles').delete().eq('id', roleId).eq('job_id', jobId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recount jobs for the contact
  if (roleRow?.contact_id) {
    const { count } = await db
      .from('contact_job_roles')
      .select('job_id', { count: 'exact', head: true })
      .eq('contact_id', roleRow.contact_id);
    await db.from('user_contacts').update({ total_jobs_together: count ?? 0 }).eq('id', roleRow.contact_id);
  }

  return NextResponse.json({ deleted: true });
}
