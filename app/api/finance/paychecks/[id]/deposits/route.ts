// app/api/finance/paychecks/[id]/deposits/route.ts
// PUT: save deposit split configuration
// POST: execute splits (create financial transactions, mark invoices paid)

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
  const { data: paycheck } = await db
    .from('paychecks')
    .select('id, net_amount')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!paycheck) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { deposits } = await request.json();
  if (!Array.isArray(deposits)) {
    return NextResponse.json({ error: 'deposits must be an array' }, { status: 400 });
  }

  // Validate sum matches net
  const totalSplit = deposits.reduce((s: number, d: { amount: number }) => s + Number(d.amount ?? 0), 0);
  const net = Number(paycheck.net_amount);
  if (Math.abs(totalSplit - net) > 0.01) {
    return NextResponse.json({
      error: `Deposit total ($${totalSplit.toFixed(2)}) must equal net amount ($${net.toFixed(2)})`,
    }, { status: 400 });
  }

  // Delete old deposits and their transactions
  const { data: oldDeposits } = await db
    .from('paycheck_deposits')
    .select('transaction_id')
    .eq('paycheck_id', id);

  const oldTxIds = (oldDeposits ?? []).map((d) => d.transaction_id).filter(Boolean);
  if (oldTxIds.length > 0) {
    await db.from('financial_transactions').delete().in('id', oldTxIds);
  }

  await db.from('paycheck_deposits').delete().eq('paycheck_id', id);

  // Insert new deposits
  if (deposits.length > 0) {
    const rows = deposits.map((d: { account_id: string; amount: number; percentage?: number; deposit_type?: string; label?: string }, i: number) => ({
      paycheck_id: id,
      account_id: d.account_id,
      amount: Number(d.amount),
      percentage: d.percentage ?? null,
      deposit_type: d.deposit_type || 'direct_deposit',
      label: d.label || null,
      sort_order: i,
    }));

    const { error } = await db.from('paycheck_deposits').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.execute) {
    return NextResponse.json({ error: 'Use PUT to save splits. POST with { execute: true } to execute.' }, { status: 400 });
  }

  const db = getDb();
  const { data: paycheck } = await db
    .from('paychecks')
    .select('id, job_id, pay_date, brand_id, paycheck_number')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!paycheck) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch deposits without transaction_id
  const { data: deposits } = await db
    .from('paycheck_deposits')
    .select('id, account_id, amount, label')
    .eq('paycheck_id', id)
    .is('transaction_id', null);

  if (!deposits?.length) {
    return NextResponse.json({ error: 'No unexecuted deposits found. Save splits first.' }, { status: 400 });
  }

  // Create transactions for each deposit
  for (const dep of deposits) {
    const { data: tx, error: txErr } = await db
      .from('financial_transactions')
      .insert({
        user_id: user.id,
        type: 'income',
        amount: dep.amount,
        description: `${paycheck.paycheck_number ?? 'Paycheck'} — ${dep.label || 'Deposit'}`,
        vendor: 'Employer',
        transaction_date: paycheck.pay_date,
        source: 'manual',
        account_id: dep.account_id,
        job_id: paycheck.job_id,
        brand_id: paycheck.brand_id,
        source_module: 'paycheck',
        source_module_id: paycheck.id,
      })
      .select('id')
      .single();

    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

    await db.from('paycheck_deposits').update({ transaction_id: tx.id }).eq('id', dep.id);
  }

  // Mark linked invoices as paid
  const { data: links } = await db
    .from('paycheck_invoices')
    .select('invoice_id')
    .eq('paycheck_id', id);

  if (links?.length) {
    await db.from('invoices').update({
      status: 'paid',
      paid_date: paycheck.pay_date,
      updated_at: new Date().toISOString(),
    }).in('id', links.map((l) => l.invoice_id));
  }

  // Reconcile paycheck
  await db.from('paychecks').update({
    status: 'reconciled',
    is_reconciled: true,
    reconciled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  // Update job status
  if (paycheck.job_id) {
    await db.from('contractor_jobs')
      .update({ status: 'paid' })
      .eq('id', paycheck.job_id)
      .eq('user_id', user.id);
  }

  return NextResponse.json({ executed: deposits.length, reconciled: true });
}
