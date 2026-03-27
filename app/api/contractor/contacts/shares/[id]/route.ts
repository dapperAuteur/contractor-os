// app/api/contractor/contacts/shares/[id]/route.ts
// PATCH: accept or decline a contact share (respects visible_fields privacy)

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

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id: shareId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  const { data: share } = await db
    .from('contact_shares')
    .select('id, contact_id, shared_with, status, visible_fields')
    .eq('id', shareId)
    .maybeSingle();

  if (!share || share.shared_with !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (share.status !== 'pending') {
    return NextResponse.json({ error: 'Share already processed' }, { status: 400 });
  }

  const body = await request.json();
  const { action } = body;

  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 });
  }

  if (action === 'decline') {
    await db.from('contact_shares').update({ status: 'declined' }).eq('id', shareId);
    return NextResponse.json({ status: 'declined' });
  }

  // Accept: copy the contact into the current user's account
  // Only copy fields allowed by visible_fields
  const allowed = new Set<string>(
    Array.isArray(share.visible_fields) ? share.visible_fields : [
      'name', 'company_name', 'job_title', 'email', 'phone', 'notes',
      'addresses', 'tags', 'website', 'paycheck_portal',
    ]
  );

  const { data: source } = await db
    .from('user_contacts')
    .select(`
      name, contact_type, contact_subtype, job_title, company_name,
      home_city, home_state, home_country, website, phone, email, notes,
      paycheck_portal_url, paycheck_portal_company_id,
      contact_phones(phone, label, is_primary, sort_order),
      contact_emails(email, label, is_primary, sort_order),
      contact_tags(tag_type, value),
      contact_addresses(label, street, city, state, postal_code, country, is_primary, sort_order)
    `)
    .eq('id', share.contact_id)
    .single();

  if (!source) {
    return NextResponse.json({ error: 'Source contact no longer exists' }, { status: 404 });
  }

  // Build the contact record with only allowed fields
  // Name is always included
  const contactData: Record<string, unknown> = {
    user_id: user.id,
    name: source.name,
    contact_type: source.contact_type ?? 'vendor',
    contact_subtype: source.contact_subtype ?? 'person',
  };

  if (allowed.has('job_title')) contactData.job_title = source.job_title;
  if (allowed.has('company_name')) contactData.company_name = source.company_name;
  if (allowed.has('company_name')) {
    contactData.home_city = source.home_city;
    contactData.home_state = source.home_state;
    contactData.home_country = source.home_country;
  }
  if (allowed.has('website')) contactData.website = source.website;
  if (allowed.has('phone')) contactData.phone = source.phone;
  if (allowed.has('email')) contactData.email = source.email;
  if (allowed.has('notes')) contactData.notes = source.notes;
  if (allowed.has('paycheck_portal')) {
    contactData.paycheck_portal_url = source.paycheck_portal_url;
    contactData.paycheck_portal_company_id = source.paycheck_portal_company_id;
  }

  const { data: newContact, error: insertErr } = await db
    .from('user_contacts')
    .insert(contactData)
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Copy phones (only if allowed)
  if (allowed.has('phone')) {
    const phones = source.contact_phones as Array<{ phone: string; label: string; is_primary: boolean; sort_order: number }>;
    if (phones?.length > 0) {
      await db.from('contact_phones').insert(
        phones.map((p) => ({ contact_id: newContact.id, ...p })),
      );
    }
  }

  // Copy emails (only if allowed)
  if (allowed.has('email')) {
    const emails = source.contact_emails as Array<{ email: string; label: string; is_primary: boolean; sort_order: number }>;
    if (emails?.length > 0) {
      await db.from('contact_emails').insert(
        emails.map((e) => ({ contact_id: newContact.id, ...e })),
      );
    }
  }

  // Copy tags (only if allowed)
  if (allowed.has('tags')) {
    const tags = source.contact_tags as Array<{ tag_type: string; value: string }>;
    if (tags?.length > 0) {
      await db.from('contact_tags').insert(
        tags.map((t) => ({ contact_id: newContact.id, tag_type: t.tag_type, value: t.value })),
      );
    }
  } else if (allowed.has('company_name') && source.company_name) {
    // Even without tags, auto-create company tag if company_name is shared
    await db.from('contact_tags').insert({
      contact_id: newContact.id,
      tag_type: 'company',
      value: source.company_name,
    });
  }

  // Copy addresses (only if allowed)
  if (allowed.has('addresses')) {
    const addrs = source.contact_addresses as Array<{ label: string; street: string | null; city: string | null; state: string | null; postal_code: string | null; country: string | null; is_primary: boolean; sort_order: number }>;
    if (addrs?.length > 0) {
      await db.from('contact_addresses').insert(
        addrs.map((a) => ({ contact_id: newContact.id, label: a.label, street: a.street, city: a.city, state: a.state, postal_code: a.postal_code, country: a.country, is_primary: a.is_primary, sort_order: a.sort_order })),
      );
    }
  }

  // Mark share as accepted
  await db.from('contact_shares').update({ status: 'accepted' }).eq('id', shareId);

  return NextResponse.json({ status: 'accepted', contact_id: newContact.id });
}
