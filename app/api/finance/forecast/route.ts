// app/api/finance/forecast/route.ts
// GET: rolling income forecast combining confirmed payments, pipeline jobs, and historical trend

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getFiscalYear, getFiscalPeriods, type FiscalConfig } from '@/lib/fiscal';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const ALLOWED_PERIODS = [30, 60, 90, 180, 270, 365];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const params = request.nextUrl.searchParams;
  const maxDays = Math.min(parseInt(params.get('days') || '90'), 365);

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const maxEnd = new Date(Date.now() + maxDays * 86400000).toISOString().split('T')[0];

  // Historical lookback: 6 months for trend calculation
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0];

  const [confirmedRes, pipelineRes, histIncomeRes, histPaidInvoicesRes, profileRes] = await Promise.all([
    // Confirmed: expected payments with known dates within max window
    db
      .from('expected_payments')
      .select('source_type, source_id, expected_date, label, reference_number, expected_amount, status')
      .eq('user_id', user.id)
      .gte('expected_date', today)
      .lte('expected_date', maxEnd)
      .order('expected_date'),

    // Unscheduled pipeline: assigned/confirmed jobs with pay_rate but no est_pay_date
    db
      .from('contractor_jobs')
      .select('id, job_number, client_name, pay_rate, ot_rate, dt_rate, rate_type, start_date, end_date, status')
      .eq('user_id', user.id)
      .in('status', ['assigned', 'confirmed'])
      .not('pay_rate', 'is', null)
      .is('est_pay_date', null),

    // Historical income transactions (last 6 months)
    db
      .from('financial_transactions')
      .select('amount, transaction_date')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .neq('source', 'transfer')
      .gte('transaction_date', sixMonthsAgo)
      .lte('transaction_date', today),

    // Historical paid invoices (last 6 months) for supplemental income data
    db
      .from('invoices')
      .select('amount_paid, paid_date')
      .eq('user_id', user.id)
      .eq('direction', 'receivable')
      .eq('status', 'paid')
      .gte('paid_date', sixMonthsAgo)
      .lte('paid_date', today),

    // User's fiscal config
    db
      .from('profiles')
      .select('fiscal_year_start_month, fiscal_year_start_day')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const confirmed = confirmedRes.data ?? [];
  const pipeline = pipelineRes.data ?? [];
  const histIncome = histIncomeRes.data ?? [];
  const histPaidInvoices = histPaidInvoicesRes.data ?? [];

  const fiscalConfig: FiscalConfig = {
    startMonth: profileRes.data?.fiscal_year_start_month ?? 1,
    startDay: profileRes.data?.fiscal_year_start_day ?? 1,
  };

  // ── Calculate historical monthly average ────────────────────────────────
  let historicalTotal = 0;
  for (const tx of histIncome) {
    historicalTotal += Number(tx.amount) || 0;
  }
  for (const inv of histPaidInvoices) {
    historicalTotal += Number(inv.amount_paid) || 0;
  }
  // Avoid double-counting: if income transactions already include invoice payments
  // (source = 'job'), the historical total may be inflated. Use the higher of the two.
  const monthsOfHistory = Math.max(
    1,
    (now.getTime() - new Date(sixMonthsAgo).getTime()) / (30.44 * 86400000)
  );
  const historicalAvgMonthly = Math.round((historicalTotal / monthsOfHistory) * 100) / 100;

  // ── Estimate pipeline job amounts ───────────────────────────────────────
  const pipelineItems: { id: string; label: string; reference_number: string; estimated_amount: number }[] = [];
  let pipelineTotal = 0;

  for (const job of pipeline) {
    let est = 0;
    const rate = Number(job.pay_rate) || 0;
    if (job.rate_type === 'daily' && job.start_date && job.end_date) {
      const days = Math.max(1, Math.ceil(
        (new Date(job.end_date).getTime() - new Date(job.start_date).getTime()) / 86400000
      ) + 1);
      est = rate * days;
    } else if (job.rate_type === 'flat') {
      est = rate;
    } else {
      // Hourly: estimate 8 hours/day, 1 day minimum
      const days = (job.start_date && job.end_date)
        ? Math.max(1, Math.ceil((new Date(job.end_date).getTime() - new Date(job.start_date).getTime()) / 86400000) + 1)
        : 1;
      est = rate * 8 * days;
    }

    pipelineTotal += est;
    pipelineItems.push({
      id: job.id,
      label: job.client_name,
      reference_number: job.job_number,
      estimated_amount: Math.round(est * 100) / 100,
    });
  }

  // ── Build rolling period totals ─────────────────────────────────────────
  const rollingPeriods: Record<string, { confirmed: number; unscheduled: number; projected: number; total: number }> = {};

  for (const days of ALLOWED_PERIODS) {
    if (days > maxDays) {
      // Still compute all periods up to 365, but only confirmed/pipeline within window
    }
    const periodEnd = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

    // Sum confirmed payments within this window
    let confirmedSum = 0;
    for (const p of confirmed) {
      if (p.expected_date <= periodEnd) {
        confirmedSum += Number(p.expected_amount) || 0;
      }
    }

    // Pipeline is not date-bound (no est_pay_date), so include proportionally
    // If pipeline jobs have start/end dates within window, include them fully
    let pipelineSum = 0;
    for (let i = 0; i < pipeline.length; i++) {
      const job = pipeline[i];
      const jobEnd = job.end_date ?? job.start_date ?? today;
      // Include if job ends within this window
      if (jobEnd <= periodEnd) {
        pipelineSum += pipelineItems[i].estimated_amount;
      }
    }

    // Trend projection: fill remaining months in the window with historical average
    const monthsInWindow = days / 30.44;
    const confirmedMonthsCovered = confirmed.length > 0
      ? Math.max(0, (new Date(confirmed[confirmed.length - 1].expected_date).getTime() - Date.now()) / (30.44 * 86400000))
      : 0;
    const projectedMonths = Math.max(0, monthsInWindow - confirmedMonthsCovered);
    const projected = Math.round(historicalAvgMonthly * projectedMonths * 100) / 100;

    const total = Math.round((confirmedSum + pipelineSum + projected) * 100) / 100;

    rollingPeriods[`${days}d`] = {
      confirmed: Math.round(confirmedSum * 100) / 100,
      unscheduled: Math.round(pipelineSum * 100) / 100,
      projected,
      total,
    };
  }

  // ── Fiscal breakdown ────────────────────────────────────────────────────
  const periods = getFiscalPeriods(fiscalConfig, today);
  const fy = getFiscalYear(today, fiscalConfig);

  // YTD income: sum paid invoices + income transactions within fiscal YTD
  let ytdIncome = 0;
  for (const tx of histIncome) {
    if (tx.transaction_date >= periods.ytd.start && tx.transaction_date <= today) {
      ytdIncome += Number(tx.amount) || 0;
    }
  }
  for (const inv of histPaidInvoices) {
    if (inv.paid_date && inv.paid_date >= periods.ytd.start && inv.paid_date <= today) {
      ytdIncome += Number(inv.amount_paid) || 0;
    }
  }

  const fiscalQuarters = periods.quarters.map((q) => {
    let qConfirmed = 0;
    let qProjected = 0;

    // Confirmed payments in this quarter
    for (const p of confirmed) {
      if (p.expected_date >= q.start && p.expected_date <= q.end) {
        qConfirmed += Number(p.expected_amount) || 0;
      }
    }

    // If quarter is in the future and has no confirmed payments, use trend
    if (q.start > today && qConfirmed === 0) {
      qProjected = historicalAvgMonthly * 3; // 3 months per quarter
    }

    return {
      label: q.label,
      quarter: q.quarter,
      start: q.start,
      end: q.end,
      confirmed: Math.round(qConfirmed * 100) / 100,
      projected: Math.round(qProjected * 100) / 100,
      total: Math.round((qConfirmed + qProjected) * 100) / 100,
    };
  });

  // ── Timeline of individual confirmed items ──────────────────────────────
  const timeline = confirmed.map((p) => ({
    date: p.expected_date,
    type: 'confirmed' as const,
    source_type: p.source_type,
    label: p.label,
    reference_number: p.reference_number,
    amount: Number(p.expected_amount) || 0,
  }));

  // Add pipeline items to timeline (no date, flagged as unscheduled)
  for (const p of pipelineItems) {
    timeline.push({
      date: '',
      type: 'unscheduled' as const,
      source_type: 'job',
      label: p.label,
      reference_number: p.reference_number,
      amount: p.estimated_amount,
    });
  }

  return NextResponse.json({
    rolling_periods: rollingPeriods,
    fiscal: {
      config: fiscalConfig,
      label: fy.label,
      ytd_income: Math.round(ytdIncome * 100) / 100,
      quarters: fiscalQuarters,
    },
    timeline,
    pipeline: {
      total: Math.round(pipelineTotal * 100) / 100,
      count: pipelineItems.length,
      items: pipelineItems,
    },
    historical_avg_monthly: historicalAvgMonthly,
  });
}
