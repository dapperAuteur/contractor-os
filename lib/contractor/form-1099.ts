// lib/contractor/form-1099.ts
// The Form 1099-NEC reporting threshold by tax year, for the Reports page's "1099" badge: a client
// that paid you at least this much in a tax year generally has to send you a 1099-NEC.
//
// Source (authoritative-values rule): IRS, "Instructions for Forms 1099-MISC and 1099-NEC",
// https://www.irs.gov/instructions/i1099mec, fetched 2026-11-01. What's New, "Increase in threshold
// for requiring filing of certain information returns and backup withholding": "For tax years
// beginning after 2025, the minimum threshold amount for reporting certain payments ... increased
// to $2,000 and may be adjusted for inflation beginning in calendar year 2027." The same page, Form
// 1099-NEC: "File Form 1099-NEC ... for each person ... to whom you have paid at least $2,000".
// Tax years through 2025 used $600 (the threshold those years' instructions printed).
//
// When the IRS publishes an inflation-adjusted amount for 2027 or later, add a row below with the
// source and fetch date. Until then, later years use the last confirmed amount and the UI says so.
//
// No imports: the node --test suites load this file directly with --experimental-strip-types.

interface ThresholdRow {
  /** First tax year this amount applies to. */
  fromYear: number;
  amount: number;
}

/** Confirmed amounts, oldest first. */
const NEC_THRESHOLDS: readonly ThresholdRow[] = [
  { fromYear: 0, amount: 600 },
  { fromYear: 2026, amount: 2000 },
];

/** The last tax year whose threshold has been checked against the IRS instructions. */
export const LAST_CONFIRMED_1099_YEAR = 2026;

export const FORM_1099_SOURCE_URL = 'https://www.irs.gov/instructions/i1099mec';

/** The 1099-NEC reporting threshold, in dollars, for payments made in `taxYear`. */
export function form1099Threshold(taxYear: number): number {
  let amount = NEC_THRESHOLDS[0].amount;
  for (const row of NEC_THRESHOLDS) {
    if (taxYear >= row.fromYear) amount = row.amount;
  }
  return amount;
}

/**
 * False for years after LAST_CONFIRMED_1099_YEAR: the amount is the last confirmed one, carried
 * forward as a fallback, and the IRS may have adjusted it for inflation.
 */
export function isForm1099ThresholdConfirmed(taxYear: number): boolean {
  return taxYear <= LAST_CONFIRMED_1099_YEAR;
}

/** True when a client's payments in `taxYear` reach that year's 1099-NEC threshold. */
export function meetsForm1099Threshold(totalPaid: number, taxYear: number): boolean {
  return totalPaid >= form1099Threshold(taxYear);
}

/** "$600", "$2,000". */
export function formatThreshold(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

/** One sentence for help text, built from the table so the help never drifts from the badge. */
export const FORM_1099_HELP_SENTENCE =
  `The 1099-NEC threshold depends on the tax year: ${formatThreshold(form1099Threshold(2025))} per client for 2025 and earlier, ` +
  `${formatThreshold(form1099Threshold(2026))} for 2026 and later (the IRS may adjust it for inflation starting in 2027; ` +
  `see ${FORM_1099_SOURCE_URL}).`;
