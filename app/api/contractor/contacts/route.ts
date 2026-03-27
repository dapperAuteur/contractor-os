// app/api/contractor/contacts/route.ts
// GET: list person contacts with enriched data (phones, emails, tags, job count)
// POST: create a person contact with phones, emails, tags

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

  const url = request.nextUrl;
  const search = url.searchParams.get('search')?.trim();
  const company = url.searchParams.get('company')?.trim();
  const role = url.searchParams.get('role')?.trim();
  const sort = url.searchParams.get('sort') ?? 'name'; // name | recent | frequent
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 200);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  const db = getDb();

  let query = db
    .from('user_contacts')
    .select(`
      id, name, contact_type, contact_subtype, email, phone, website,
      job_title, company_name, home_city, home_state, home_country,
      last_worked_with, total_jobs_together, notes, use_count, created_at,
      contact_phones(id, phone, label, is_primary, sort_order),
      contact_emails(id, email, label, is_primary, sort_order),
      contact_tags(id, tag_type, value),
      contact_addresses(id, label, street, city, state, postal_code, country, is_primary, sort_order)
    `)
    .eq('user_id', user.id);

  // Filter to person contacts (include null subtype for backward compat with older contacts)
  if (!url.searchParams.has('all')) {
    query = query.or('contact_subtype.eq.person,contact_subtype.is.null');
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,company_name.ilike.%${search}%,job_title.ilike.%${search}%`);
  }

  // Sort
  if (sort === 'recent') {
    query = query.order('last_worked_with', { ascending: false, nullsFirst: false });
  } else if (sort === 'frequent') {
    query = query.order('total_jobs_together', { ascending: false });
  } else {
    query = query.order('name', { ascending: true });
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let contacts = data ?? [];

  // Post-filter by company tag (Supabase doesn't support filtering by nested relation easily)
  if (company) {
    contacts = contacts.filter((c: Record<string, unknown>) =>
      (c.contact_tags as Array<{ tag_type: string; value: string }>)?.some(
        (t) => t.tag_type === 'company' && t.value.toLowerCase() === company.toLowerCase(),
      ),
    );
  }

  // Post-filter by role tag
  if (role) {
    contacts = contacts.filter((c: Record<string, unknown>) =>
      (c.contact_tags as Array<{ tag_type: string; value: string }>)?.some(
        (t) => t.tag_type === 'role' && t.value.toLowerCase() === role.toLowerCase(),
      ),
    );
  }

  return NextResponse.json({ contacts, total: contacts.length });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    name, job_title, company_name,
    home_city, home_state, home_country,
    website, paycheck_portal_url, paycheck_portal_company_id,
    notes, phones, emails, tags, addresses,
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const db = getDb();

  // Create the contact
  const { data: contact, error: contactErr } = await db
    .from('user_contacts')
    .insert({
      user_id: user.id,
      name: name.trim(),
      contact_type: 'vendor', // use vendor type for backward compat with existing system
      contact_subtype: 'person',
      job_title: job_title?.trim() ?? null,
      company_name: company_name?.trim() ?? null,
      home_city: home_city?.trim() ?? null,
      home_state: home_state?.trim() ?? null,
      home_country: home_country?.trim() ?? null,
      website: website?.trim() ?? null,
      paycheck_portal_url: paycheck_portal_url?.trim() ?? null,
      paycheck_portal_company_id: paycheck_portal_company_id?.trim() ?? null,
      notes: notes?.trim() ?? null,
      // Set legacy single phone/email from primary values
      phone: (phones as Array<{ phone: string; is_primary?: boolean }>)?.find((p) => p.is_primary)?.phone
        ?? (phones as Array<{ phone: string }>)?.[0]?.phone ?? null,
      email: (emails as Array<{ email: string; is_primary?: boolean }>)?.find((e) => e.is_primary)?.email
        ?? (emails as Array<{ email: string }>)?.[0]?.email ?? null,
    })
    .select()
    .single();

  if (contactErr) return NextResponse.json({ error: contactErr.message }, { status: 500 });

  // Insert phones
  if (Array.isArray(phones) && phones.length > 0) {
    const phoneRows = phones.map((p: { phone: string; label?: string; is_primary?: boolean }, i: number) => ({
      contact_id: contact.id,
      phone: p.phone.trim(),
      label: p.label ?? 'mobile',
      is_primary: p.is_primary ?? i === 0,
      sort_order: i,
    }));
    await db.from('contact_phones').insert(phoneRows);
  }

  // Insert emails
  if (Array.isArray(emails) && emails.length > 0) {
    const emailRows = emails.map((e: { email: string; label?: string; is_primary?: boolean }, i: number) => ({
      contact_id: contact.id,
      email: e.email.trim(),
      label: e.label ?? 'work',
      is_primary: e.is_primary ?? i === 0,
      sort_order: i,
    }));
    await db.from('contact_emails').insert(emailRows);
  }

  // Insert tags
  const allTags: Array<{ contact_id: string; tag_type: string; value: string }> = [];

  // Auto-create company tag from company_name
  if (company_name?.trim()) {
    allTags.push({ contact_id: contact.id, tag_type: 'company', value: company_name.trim() });
  }

  if (Array.isArray(tags)) {
    for (const t of tags as Array<{ tag_type: string; value: string }>) {
      if (t.tag_type && t.value?.trim()) {
        allTags.push({ contact_id: contact.id, tag_type: t.tag_type, value: t.value.trim() });
      }
    }
  }

  if (allTags.length > 0) {
    await db.from('contact_tags').upsert(allTags, { onConflict: 'contact_id,tag_type,value' });
  }

  // Insert addresses
  if (Array.isArray(addresses) && addresses.length > 0) {
    const addrRows = addresses.map((a: { label?: string; street?: string; city?: string; state?: string; postal_code?: string; country?: string; is_primary?: boolean }, i: number) => ({
      contact_id: contact.id,
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

  // Re-fetch with relations
  const { data: full } = await db
    .from('user_contacts')
    .select(`
      id, name, contact_type, contact_subtype, email, phone, website,
      job_title, company_name, home_city, home_state, home_country,
      last_worked_with, total_jobs_together, notes, use_count, created_at,
      contact_phones(id, phone, label, is_primary, sort_order),
      contact_emails(id, email, label, is_primary, sort_order),
      contact_tags(id, tag_type, value),
      contact_addresses(id, label, street, city, state, postal_code, country, is_primary, sort_order)
    `)
    .eq('id', contact.id)
    .single();

  return NextResponse.json({ contact: full }, { status: 201 });
}
