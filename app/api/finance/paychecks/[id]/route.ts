// app/api/finance/paychecks/[id]/route.ts
// GET: single paycheck with all nested data
// PATCH: update paycheck, reconcile action
// DELETE: remove paycheck and clean up references

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { checkOwned, checkReferences, invalidReferenceMessage } from '@/lib/auth/ownership';
import { visiblePaycheckEmbeds } from '@/lib/finance/paycheck-embeds';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const { data, error } = await db
    .from('paychecks')
    .select(`
      *,
      contractor_jobs(id, user_id, job_number, client_name, event_name, client_id, user_contacts:client_id(user_id, paycheck_portal_url, paycheck_portal_company_id)),
      paycheck_invoices(invoice_id, invoices(id, invoice_number, total, status, invoice_date)),
      paycheck_taxes(id, tax_type, label, expected_amount, actual_amount, sort_order, notes),
      paycheck_deposits(id, account_id, amount, percentage, deposit_type, transaction_id, label, sort_order, financial_accounts(id, user_id, name, account_type))
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // The job and deposit accounts are joined through stored ids with the service
  // role: show them only when the caller may see them.
  return NextResponse.json(await visiblePaycheckEmbeds(db, user.id, data));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const body = await request.json();

  // Verify ownership
  const { data: existing } = await db
    .from('paychecks')
    .select('id, job_id, gross_amount, taxes_total, other_deductions_total')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Reconcile action
  if (body.reconcile) {
    await db.from('paychecks').update({
      status: 'reconciled',
      is_reconciled: true,
      reconciled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    // Mark all linked invoices as paid
    const { data: links } = await db
      .from('paycheck_invoices')
      .select('invoice_id')
      .eq('paycheck_id', id);

    if (links?.length) {
      const invoiceIds = links.map((l) => l.invoice_id);
      await db.from('invoices').update({
        status: 'paid',
        paid_date: body.pay_date || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      }).in('id', invoiceIds).eq('user_id', user.id);
    }

    // Update job status to paid
    if (existing.job_id) {
      await db.from('contractor_jobs')
        .update({ status: 'paid' })
        .eq('id', existing.job_id)
        .eq('user_id', user.id);
    }

    const { data } = await db.from('paychecks').select('*').eq('id', id).single();
    return NextResponse.json(data);
  }

  // Unreconcile action
  if (body.unreconcile) {
    await db.from('paychecks').update({
      status: 'pending',
      is_reconciled: false,
      reconciled_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    const { data } = await db.from('paychecks').select('*').eq('id', id).single();
    return NextResponse.json(data);
  }

  // Standard field updates
  const allowed = [
    'paycheck_number', 'pay_period_start', 'pay_period_end', 'pay_date',
    'gross_amount', 'benefits_total', 'other_deductions', 'other_deductions_total',
    'variance_notes', 'status', 'brand_id', 'notes',
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  const refs = await checkReferences(db, user.id, [{ field: 'brand_id', table: 'user_brands', id: updates.brand_id }]);
  if (refs.failed) return NextResponse.json({ error: 'Could not verify references' }, { status: 500 });
  if (!refs.ok) return NextResponse.json({ error: invalidReferenceMessage(refs.invalid) }, { status: 400 });

  // Recalculate net when amounts change
  const gross = Number(body.gross_amount ?? existing.gross_amount);
  const taxes = Number(body.taxes_total ?? existing.taxes_total);
  const otherDed = Number(body.other_deductions_total ?? existing.other_deductions_total);
  updates.net_amount = Math.round((gross - taxes - otherDed) * 100) / 100;

  if (body.gross_amount != null && existing.gross_amount != null) {
    const { data: pc } = await db.from('paychecks').select('expected_gross').eq('id', id).single();
    if (pc?.expected_gross != null) {
      updates.variance_amount = Math.round((Number(body.gross_amount) - Number(pc.expected_gross)) * 100) / 100;
    }
  }

  const { data, error } = await db
    .from('paychecks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Ownership first: everything below is keyed on the paycheck id.
  const owned = await checkOwned(db, user.id, 'paychecks', id);
  if (owned.failed) return NextResponse.json({ error: 'Could not verify ownership' }, { status: 500 });
  if (!owned.allowed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Clear paycheck_id on linked invoices
  await db.from('invoices').update({ paycheck_id: null }).eq('paycheck_id', id).eq('user_id', user.id);

  // Delete linked deposit transactions
  const { data: deposits } = await db
    .from('paycheck_deposits')
    .select('transaction_id')
    .eq('paycheck_id', id);

  const txIds = (deposits ?? []).map((d) => d.transaction_id).filter(Boolean);
  if (txIds.length > 0) {
    await db.from('financial_transactions').delete().in('id', txIds).eq('user_id', user.id);
  }

  // Delete paycheck (cascades to paycheck_invoices, paycheck_taxes, paycheck_deposits)
  const { error } = await db.from('paychecks').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
