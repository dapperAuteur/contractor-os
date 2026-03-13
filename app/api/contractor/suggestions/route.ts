// app/api/contractor/suggestions/route.ts
// GET: distinct historical values for union_local or department
// Used to populate suggestion dropdowns on the job form.
// Pulls from both contractor_jobs and contractor_rate_cards for this user.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const ALLOWED_FIELDS = ['union_local', 'department'] as const;
type SuggestionField = typeof ALLOWED_FIELDS[number];

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

  const field = request.nextUrl.searchParams.get('field') as SuggestionField | null;
  if (!field || !ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json({ error: 'field must be union_local or department' }, { status: 400 });
  }

  const db = getDb();

  const [{ data: jobVals }, { data: cardVals }] = await Promise.all([
    db
      .from('contractor_jobs')
      .select(field)
      .eq('user_id', user.id)
      .not(field, 'is', null)
      .not(field, 'eq', ''),
    db
      .from('contractor_rate_cards')
      .select(field)
      .eq('user_id', user.id)
      .not(field, 'is', null)
      .not(field, 'eq', ''),
  ]);

  // Combine, deduplicate, sort by frequency
  const freq: Record<string, number> = {};
  for (const row of [...(jobVals ?? []), ...(cardVals ?? [])]) {
    const val = (row as Record<string, string>)[field]?.trim();
    if (val) freq[val] = (freq[val] ?? 0) + 1;
  }

  const suggestions = Object.entries(freq)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value]) => value);

  return NextResponse.json(suggestions);
}
