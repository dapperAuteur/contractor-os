// app/api/finance/paychecks/[id]/taxes/route.ts
// PUT: bulk upsert tax withholding lines, recompute totals

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

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Verify ownership
  const { data: paycheck } = await db
    .from('paychecks')
    .select('id, gross_amount, other_deductions_total')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!paycheck) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { taxes } = await request.json();
  if (!Array.isArray(taxes)) {
    return NextResponse.json({ error: 'taxes must be an array' }, { status: 400 });
  }

  // Replace all tax lines
  await db.from('paycheck_taxes').delete().eq('paycheck_id', id);

  if (taxes.length > 0) {
    const rows = taxes.map((t: { tax_type: string; label: string; expected_amount?: number; actual_amount: number; sort_order?: number; notes?: string }, i: number) => ({
      paycheck_id: id,
      tax_type: t.tax_type,
      label: t.label,
      expected_amount: t.expected_amount ?? null,
      actual_amount: Number(t.actual_amount) || 0,
      sort_order: t.sort_order ?? i,
      notes: t.notes ?? null,
    }));

    const { error: insertErr } = await db.from('paycheck_taxes').insert(rows);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Recompute totals
  const taxesTotal = taxes.reduce((sum: number, t: { actual_amount: number }) => sum + (Number(t.actual_amount) || 0), 0);
  const netAmount = Math.round((Number(paycheck.gross_amount) - taxesTotal - Number(paycheck.other_deductions_total)) * 100) / 100;

  await db.from('paychecks').update({
    taxes_total: Math.round(taxesTotal * 100) / 100,
    net_amount: netAmount,
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  return NextResponse.json({ taxes_total: taxesTotal, net_amount: netAmount });
}
