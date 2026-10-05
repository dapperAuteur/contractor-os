// app/api/contractor/contacts/shares/route.ts
// GET: list pending contact shares for the current user

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// The fields a share copies on accept when the sharer set no list
// (contacts/shares/[id]). The pending preview follows the same list, so a
// recipient never sees a phone or email the sharer chose to hide.
const DEFAULT_VISIBLE = ['name', 'company_name', 'job_title', 'email', 'phone', 'notes', 'addresses', 'tags', 'website', 'paycheck_portal'];

function previewShare<T extends { visible_fields?: unknown; user_contacts?: unknown }>(share: T) {
  const allowed = new Set<string>(Array.isArray(share.visible_fields) ? share.visible_fields as string[] : DEFAULT_VISIBLE);
  const raw = Array.isArray(share.user_contacts) ? share.user_contacts[0] : share.user_contacts;
  if (!raw || typeof raw !== 'object') return { ...share, visible_fields: undefined };
  const contact: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  for (const field of ['job_title', 'company_name']) if (!allowed.has(field)) contact[field] = null;
  if (!allowed.has('phone')) { contact.phone = null; if ('contact_phones' in contact) contact.contact_phones = []; }
  if (!allowed.has('email')) { contact.email = null; if ('contact_emails' in contact) contact.contact_emails = []; }
  return { ...share, user_contacts: contact, visible_fields: undefined };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  const { data, error } = await db
    .from('contact_shares')
    .select(`
      id, message, status, created_at, visible_fields,
      user_contacts(id, name, job_title, company_name, phone, email,
        contact_phones(phone, label, is_primary),
        contact_emails(email, label, is_primary)
      ),
      shared_by_profile:profiles!contact_shares_shared_by_fkey(username, display_name)
    `)
    .eq('shared_with', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback without profile join if FK alias fails
    const { data: fallback, error: err2 } = await db
      .from('contact_shares')
      .select(`
        id, message, status, created_at, shared_by, visible_fields,
        user_contacts(id, name, job_title, company_name, phone, email)
      `)
      .eq('shared_with', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
    return NextResponse.json({ shares: (fallback ?? []).map(previewShare) });
  }

  return NextResponse.json({ shares: (data ?? []).map(previewShare) });
}
