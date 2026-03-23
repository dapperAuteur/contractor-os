// app/api/contractor/contacts/shares/route.ts
// GET: list pending contact shares for the current user

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  const { data, error } = await db
    .from('contact_shares')
    .select(`
      id, message, status, created_at,
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
        id, message, status, created_at, shared_by,
        user_contacts(id, name, job_title, company_name, phone, email)
      `)
      .eq('shared_with', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
    return NextResponse.json({ shares: fallback ?? [] });
  }

  return NextResponse.json({ shares: data ?? [] });
}
