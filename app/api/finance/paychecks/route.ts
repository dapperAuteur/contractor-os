// app/api/finance/paychecks/route.ts
// GET: list paychecks with filters
// POST: create a paycheck from selected invoices

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { checkInvoiceReferences, invoiceReferences } from '@/lib/finance/invoice-references';
import { invalidReferenceMessage } from '@/lib/auth/ownership';
import { visiblePaycheckEmbeds } from '@/lib/finance/paycheck-embeds';

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
  const jobId = url.searchParams.get('job_id');
  const status = url.searchParams.get('status');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);

  const db = getDb();
  let query = db
    .from('paychecks')
    .select(`
      *,
      contractor_jobs(id, user_id, job_number, client_name),
      paycheck_invoices(invoice_id),
      paycheck_taxes(id, tax_type, label, actual_amount),
      paycheck_deposits(id, account_id, amount, label, financial_accounts(user_id, name))
    `)
    .eq('user_id', user.id)
    .order('pay_date', { ascending: false })
    .limit(limit);

  if (jobId) query = query.eq('job_id', jobId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(await visiblePaycheckEmbeds(db, user.id, data ?? []));
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { job_id, pay_period_start, pay_period_end, pay_date, invoice_ids, gross_amount, paycheck_number, brand_id, notes } = body;

  if (!pay_period_start || !pay_period_end || !pay_date) {
    return NextResponse.json({ error: 'pay_period_start, pay_period_end, and pay_date are required' }, { status: 400 });
  }
  if (!invoice_ids?.length) {
    return NextResponse.json({ error: 'At least one invoice_id is required' }, { status: 400 });
  }

  const db = getDb();

  // The job may be one the caller works (owner, lister, crew); the brand must be theirs.
  const refs = await checkInvoiceReferences(db, user.id, invoiceReferences({ job_id, brand_id }));
  if (refs.failed) return NextResponse.json({ error: 'Could not verify references' }, { status: 500 });
  if (!refs.ok) return NextResponse.json({ error: invalidReferenceMessage(refs.invalid) }, { status: 400 });

  // Fetch invoices and compute expected gross
  const { data: invoices } = await db
    .from('invoices')
    .select('id, total, job_id')
    .in('id', invoice_ids)
    .eq('user_id', user.id);

  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ error: 'No valid invoices found' }, { status: 400 });
  }

  const expectedGross = invoices.reduce((sum, inv) => sum + Number(inv.total ?? 0), 0);
  const actualGross = gross_amount != null ? Number(gross_amount) : expectedGross;
  const variance = Math.round((actualGross - expectedGross) * 100) / 100;

  // Create paycheck
  const { data: paycheck, error: pcError } = await db
    .from('paychecks')
    .insert({
      user_id: user.id,
      job_id: job_id || invoices[0]?.job_id || null,
      paycheck_number: paycheck_number || `CHK-${pay_date}`,
      pay_period_start,
      pay_period_end,
      pay_date,
      gross_amount: actualGross,
      expected_gross: expectedGross,
      variance_amount: variance,
      net_amount: actualGross, // will be adjusted when taxes/deductions added
      brand_id: brand_id || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (pcError) return NextResponse.json({ error: pcError.message }, { status: 500 });

  // Link invoices
  const joinRows = invoices.map((inv) => ({
    paycheck_id: paycheck.id,
    invoice_id: inv.id,
  }));

  await db.from('paycheck_invoices').insert(joinRows);

  // Set paycheck_id on invoices
  await db
    .from('invoices')
    .update({ paycheck_id: paycheck.id })
    // Only the caller's invoices fetched above, never ids straight from the body.
    .in('id', invoices.map((inv) => inv.id))
    .eq('user_id', user.id);

  return NextResponse.json(paycheck, { status: 201 });
}
