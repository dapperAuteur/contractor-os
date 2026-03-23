// app/api/contractor/contacts/[id]/roles/route.ts
// GET: list job roles for a contact
// POST: add a job role for this contact (crew sheet entry)
// DELETE: remove a job role

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
  const { id: contactId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Verify ownership
  const { data: contact } = await db
    .from('user_contacts')
    .select('user_id')
    .eq('id', contactId)
    .maybeSingle();
  if (!contact || contact.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await db
    .from('contact_job_roles')
    .select(`
      id, role, role_label, notes, created_at,
      contractor_jobs(id, job_number, client_name, event_name, location_name, status, start_date, end_date)
    `)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ roles: data ?? [] });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: contactId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Verify ownership
  const { data: contact } = await db
    .from('user_contacts')
    .select('user_id')
    .eq('id', contactId)
    .maybeSingle();
  if (!contact || contact.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { job_id, event_id, role, role_label, notes } = body;

  if (!job_id) return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
  if (!role) return NextResponse.json({ error: 'role is required' }, { status: 400 });

  // Verify job ownership
  const { data: job } = await db
    .from('contractor_jobs')
    .select('id, user_id, start_date, client_name')
    .eq('id', job_id)
    .maybeSingle();
  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const { data: roleData, error } = await db
    .from('contact_job_roles')
    .upsert(
      {
        contact_id: contactId,
        job_id,
        event_id: event_id ?? null,
        role,
        role_label: role_label?.trim() ?? null,
        notes: notes?.trim() ?? null,
      },
      { onConflict: 'contact_id,job_id,role' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-capture: update denormalized fields on user_contacts
  const updates: Record<string, unknown> = {};

  if (job.start_date) {
    const { data: current } = await db
      .from('user_contacts')
      .select('last_worked_with, total_jobs_together')
      .eq('id', contactId)
      .single();

    if (current) {
      if (!current.last_worked_with || job.start_date > current.last_worked_with) {
        updates.last_worked_with = job.start_date;
      }
    }
  }

  // Count distinct jobs for this contact
  const { count } = await db
    .from('contact_job_roles')
    .select('job_id', { count: 'exact', head: true })
    .eq('contact_id', contactId);

  if (count !== null) updates.total_jobs_together = count;

  // Auto-add company tag from job client_name if not already tagged
  if (job.client_name) {
    await db.from('contact_tags').upsert(
      { contact_id: contactId, tag_type: 'company', value: job.client_name },
      { onConflict: 'contact_id,tag_type,value' },
    );
  }

  if (Object.keys(updates).length > 0) {
    await db.from('user_contacts').update(updates).eq('id', contactId);
  }

  return NextResponse.json({ role: roleData }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id: contactId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Verify ownership
  const { data: contact } = await db
    .from('user_contacts')
    .select('user_id')
    .eq('id', contactId)
    .maybeSingle();
  if (!contact || contact.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const roleId = request.nextUrl.searchParams.get('role_id');
  if (!roleId) return NextResponse.json({ error: 'role_id is required' }, { status: 400 });

  const { error } = await db.from('contact_job_roles').delete().eq('id', roleId).eq('contact_id', contactId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recount jobs
  const { count } = await db
    .from('contact_job_roles')
    .select('job_id', { count: 'exact', head: true })
    .eq('contact_id', contactId);

  await db.from('user_contacts').update({ total_jobs_together: count ?? 0 }).eq('id', contactId);

  return NextResponse.json({ deleted: true });
}
