// app/api/finance/paychecks/from-job/route.ts
// POST: auto-create a paycheck from a job's un-paychecked invoices

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { job_id, pay_date, pay_period_start, pay_period_end } = await request.json();

  if (!job_id) return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
  if (!pay_date) return NextResponse.json({ error: 'pay_date is required' }, { status: 400 });

  const db = getDb();

  // Fetch un-paychecked invoices for this job
  const { data: invoices } = await db
    .from('invoices')
    .select('id, total, invoice_date')
    .eq('user_id', user.id)
    .eq('job_id', job_id)
    .is('paycheck_id', null)
    .order('invoice_date');

  if (!invoices?.length) {
    return NextResponse.json({ error: 'No invoices available for this job' }, { status: 400 });
  }

  // Auto-compute date range from invoices if not provided
  const dates = invoices.map((i) => i.invoice_date).filter(Boolean).sort();
  const start = pay_period_start || dates[0] || pay_date;
  const end = pay_period_end || dates[dates.length - 1] || pay_date;

  const expectedGross = invoices.reduce((sum, inv) => sum + Number(inv.total ?? 0), 0);

  // Fetch job info for paycheck number
  const { data: job } = await db
    .from('contractor_jobs')
    .select('job_number, client_name')
    .eq('id', job_id)
    .single();

  const paycheckNumber = `${job?.job_number ?? 'CHK'}-${pay_date}`;

  // Create paycheck
  const { data: paycheck, error: pcErr } = await db
    .from('paychecks')
    .insert({
      user_id: user.id,
      job_id,
      paycheck_number: paycheckNumber,
      pay_period_start: start,
      pay_period_end: end,
      pay_date,
      gross_amount: expectedGross,
      expected_gross: expectedGross,
      variance_amount: 0,
      net_amount: expectedGross,
    })
    .select()
    .single();

  if (pcErr) return NextResponse.json({ error: pcErr.message }, { status: 500 });

  // Link invoices
  await db.from('paycheck_invoices').insert(
    invoices.map((inv) => ({ paycheck_id: paycheck.id, invoice_id: inv.id }))
  );

  await db.from('invoices').update({ paycheck_id: paycheck.id }).in('id', invoices.map((i) => i.id));

  return NextResponse.json({ ...paycheck, invoice_count: invoices.length }, { status: 201 });
}
