// app/api/contractor/contacts/[id]/route.ts
// GET: contact detail with phones, emails, tags, and job history
// PATCH: update contact fields, phones, emails, tags
// DELETE: remove contact

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

async function getOwnedContact(db: ReturnType<typeof getDb>, contactId: string, userId: string) {
  const { data } = await db
    .from('user_contacts')
    .select('id, user_id')
    .eq('id', contactId)
    .maybeSingle();
  if (!data || data.user_id !== userId) return null;
  return data;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const owned = await getOwnedContact(db, id, user.id);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch contact with all relations
  const { data: contact, error } = await db
    .from('user_contacts')
    .select(`
      id, name, contact_type, contact_subtype, email, phone, website, paycheck_portal_url, paycheck_portal_company_id,
      job_title, company_name, home_city, home_state, home_country,
      last_worked_with, total_jobs_together, notes, use_count, created_at,
      contact_phones(id, phone, label, is_primary, sort_order),
      contact_emails(id, email, label, is_primary, sort_order),
      contact_tags(id, tag_type, value),
      contact_locations(id, label, address, lat, lng, is_default, sort_order)
    `)
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch job history via contact_job_roles
  const { data: jobRoles } = await db
    .from('contact_job_roles')
    .select(`
      id, role, role_label, notes, created_at,
      contractor_jobs(id, job_number, client_name, event_name, location_name, status, start_date, end_date)
    `)
    .eq('contact_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    contact,
    job_roles: jobRoles ?? [],
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const owned = await getOwnedContact(db, id, user.id);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();

  // Update main contact fields
  const allowedFields = [
    'name', 'job_title', 'company_name', 'home_city', 'home_state', 'home_country', 'website', 'paycheck_portal_url', 'paycheck_portal_company_id', 'notes',
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
  }

  if (Object.keys(updates).length > 0) {
    // Sync legacy phone/email if company_name changed
    const { error } = await db.from('user_contacts').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Replace phones if provided
  if (Array.isArray(body.phones)) {
    await db.from('contact_phones').delete().eq('contact_id', id);
    if (body.phones.length > 0) {
      const phoneRows = body.phones.map((p: { phone: string; label?: string; is_primary?: boolean }, i: number) => ({
        contact_id: id,
        phone: p.phone.trim(),
        label: p.label ?? 'mobile',
        is_primary: p.is_primary ?? i === 0,
        sort_order: i,
      }));
      await db.from('contact_phones').insert(phoneRows);
    }
    // Sync legacy phone field
    const primary = body.phones.find((p: { is_primary?: boolean }) => p.is_primary) ?? body.phones[0];
    await db.from('user_contacts').update({ phone: primary?.phone?.trim() ?? null }).eq('id', id);
  }

  // Replace emails if provided
  if (Array.isArray(body.emails)) {
    await db.from('contact_emails').delete().eq('contact_id', id);
    if (body.emails.length > 0) {
      const emailRows = body.emails.map((e: { email: string; label?: string; is_primary?: boolean }, i: number) => ({
        contact_id: id,
        email: e.email.trim(),
        label: e.label ?? 'work',
        is_primary: e.is_primary ?? i === 0,
        sort_order: i,
      }));
      await db.from('contact_emails').insert(emailRows);
    }
    // Sync legacy email field
    const primary = body.emails.find((e: { is_primary?: boolean }) => e.is_primary) ?? body.emails[0];
    await db.from('user_contacts').update({ email: primary?.email?.trim() ?? null }).eq('id', id);
  }

  // Replace tags if provided
  if (Array.isArray(body.tags)) {
    await db.from('contact_tags').delete().eq('contact_id', id);
    const tagRows = body.tags
      .filter((t: { tag_type: string; value: string }) => t.tag_type && t.value?.trim())
      .map((t: { tag_type: string; value: string }) => ({
        contact_id: id,
        tag_type: t.tag_type,
        value: t.value.trim(),
      }));
    if (tagRows.length > 0) {
      await db.from('contact_tags').upsert(tagRows, { onConflict: 'contact_id,tag_type,value' });
    }

    // Sync company_name from company tag
    const companyTag = body.tags.find((t: { tag_type: string }) => t.tag_type === 'company');
    if (companyTag) {
      await db.from('user_contacts').update({ company_name: companyTag.value.trim() }).eq('id', id);
    }
  }

  // Replace addresses if provided
  if (Array.isArray(body.addresses)) {
    await db.from('contact_addresses').delete().eq('contact_id', id);
    if (body.addresses.length > 0) {
      const addrRows = body.addresses.map((a: { label?: string; street?: string; city?: string; state?: string; postal_code?: string; country?: string; is_primary?: boolean }, i: number) => ({
        contact_id: id,
        label: a.label ?? 'home',
        street: a.street?.trim() ?? null,
        city: a.city?.trim() ?? null,
        state: a.state?.trim() ?? null,
        postal_code: a.postal_code?.trim() ?? null,
        country: a.country?.trim() ?? null,
        is_primary: a.is_primary ?? i === 0,
        sort_order: i,
      }));
      await db.from('contact_addresses').insert(addrRows);
    }
  }

  // Re-fetch
  const { data: updated } = await db
    .from('user_contacts')
    .select(`
      id, name, contact_type, contact_subtype, email, phone, website, paycheck_portal_url, paycheck_portal_company_id,
      job_title, company_name, home_city, home_state, home_country,
      last_worked_with, total_jobs_together, notes, use_count, created_at,
      contact_phones(id, phone, label, is_primary, sort_order),
      contact_emails(id, email, label, is_primary, sort_order),
      contact_tags(id, tag_type, value),
      contact_addresses(id, label, street, city, state, postal_code, country, is_primary, sort_order)
    `)
    .eq('id', id)
    .single();

  return NextResponse.json({ contact: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const owned = await getOwnedContact(db, id, user.id);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await db.from('user_contacts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
