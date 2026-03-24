// app/api/contractor/contacts/companies/route.ts
// GET: list distinct company tags for the current user's contacts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Get all company tags for this user's contacts
  const { data, error } = await db
    .from('contact_tags')
    .select('value, contact_id, user_contacts!inner(user_id)')
    .eq('tag_type', 'company')
    .eq('user_contacts.user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate: count contacts per company
  const companyMap = new Map<string, number>();
  for (const row of data ?? []) {
    const count = companyMap.get(row.value) ?? 0;
    companyMap.set(row.value, count + 1);
  }

  const companies = Array.from(companyMap.entries())
    .map(([name, contact_count]) => ({ name, contact_count }))
    .sort((a, b) => b.contact_count - a.contact_count);

  return NextResponse.json({ companies });
}
