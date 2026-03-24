// app/api/finance/expected-payments/route.ts
// GET: returns expected incoming payments from the expected_payments VIEW

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getFiscalQuarter, type FiscalConfig } from '@/lib/fiscal';

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

  const db = getDb();
  const params = request.nextUrl.searchParams;
  const range = Math.min(Math.max(parseInt(params.get('range') || '90'), 1), 365);

  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + range * 86400000).toISOString().split('T')[0];

  const [paymentsRes, profileRes] = await Promise.all([
    db
      .from('expected_payments')
      .select('source_type, source_id, expected_date, label, reference_number, expected_amount, status, brand_id')
      .eq('user_id', user.id)
      .gte('expected_date', today)
      .lte('expected_date', endDate)
      .order('expected_date', { ascending: true }),
    db
      .from('profiles')
      .select('fiscal_year_start_month, fiscal_year_start_day')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const payments = paymentsRes.data ?? [];
  const fiscalConfig: FiscalConfig = {
    startMonth: profileRes.data?.fiscal_year_start_month ?? 1,
    startDay: profileRes.data?.fiscal_year_start_day ?? 1,
  };

  // Totals
  let totalAmount = 0;
  let jobAmount = 0;
  let jobCount = 0;
  let invoiceAmount = 0;
  let invoiceCount = 0;

  // Group by fiscal quarter
  const quarterMap: Record<string, { label: string; total: number; count: number; payments: typeof payments }> = {};

  for (const p of payments) {
    const amt = Number(p.expected_amount) || 0;
    totalAmount += amt;

    if (p.source_type === 'job') {
      jobAmount += amt;
      jobCount++;
    } else {
      invoiceAmount += amt;
      invoiceCount++;
    }

    const q = getFiscalQuarter(p.expected_date, fiscalConfig);
    if (!quarterMap[q.label]) {
      quarterMap[q.label] = { label: q.label, total: 0, count: 0, payments: [] };
    }
    quarterMap[q.label].total += amt;
    quarterMap[q.label].count++;
    quarterMap[q.label].payments.push(p);
  }

  return NextResponse.json({
    payments,
    totals: {
      total_amount: Math.round(totalAmount * 100) / 100,
      count: payments.length,
      by_source: {
        job: { amount: Math.round(jobAmount * 100) / 100, count: jobCount },
        invoice: { amount: Math.round(invoiceAmount * 100) / 100, count: invoiceCount },
      },
    },
    by_quarter: Object.values(quarterMap),
  });
}
