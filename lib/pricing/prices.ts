// lib/pricing/prices.ts
// The one source for every price Work.WitUS shows a person: the pricing pages, billing, the home and
// landing pages, help articles, and the admin overview. Change a price here and every page follows;
// tests/pricing-consistency.test.ts fails if a page types a price of its own.
//
// These are DISPLAY prices. What Stripe actually charges is set by the Stripe Price objects named in
// the STRIPE_*_PRICE_ID env vars (see app/api/stripe/checkout/route.ts); this module does not change
// them. If Stripe's prices change, change these to match what the Stripe dashboard shows.
//
// Confirmed by BAM 2026-11-01 (plans/bugs/2026-11-01-1099-threshold-and-price-mismatch.md):
// $10.60/month and $103.29 lifetime by card, $100 lifetime by CashApp. The card prices carry
// Stripe's 2.9% + $0.30 fee so the business nets about $10 and $100; CashApp has no buyer fee.
//
// No imports: the node --test suites load this file directly with --experimental-strip-types.

/** Work.WitUS (contractor) plans. */
export const CONTRACTOR_PRICES = {
  /** Monthly subscription, paid by card through Stripe. */
  monthly: 10.6,
  /** Annual subscription, paid by card (offered once the founder lifetime window closes). */
  annual: 103.29,
  /** Lifetime, one payment by card through Stripe. */
  lifetimeCard: 103.29,
  /** Lifetime, one payment through CashApp (no processing fee to the buyer). */
  lifetimeCashApp: 100,
} as const;

/**
 * What the business keeps per sale after card fees, for the admin revenue estimates only. Never
 * show these to a customer.
 */
export const CONTRACTOR_NET = {
  monthly: 10,
  lifetime: 100,
} as const;

/** CrewOps (lister) plans: an intro promo price and the regular price it is discounted from. */
export const LISTER_PRICES = {
  introMonthly: 10.6,
  introAnnual: 103.29,
  regularMonthly: 50,
  regularAnnual: 500,
} as const;

/** "$10.60", "$100", "$103.29": whole dollars drop the cents. */
export function formatPrice(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/** Same as formatPrice, but always two decimals ("$100.00"), for price cards. */
export function formatPriceCents(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Monthly cost of an annual plan, for "$8.61/month, billed annually". */
export function perMonthOfAnnual(annual: number): string {
  return formatPriceCents(annual / 12);
}

/** How much a year of the annual plan saves over twelve monthly payments. */
export function annualSavings(monthly: number, annual: number): string {
  return formatPriceCents(Math.round((monthly * 12 - annual) * 100) / 100);
}

/** "$10.60/month or $103.29/year", the short line used on landing pages and in metadata. */
export const CONTRACTOR_PRICE_SUMMARY =
  `${formatPrice(CONTRACTOR_PRICES.monthly)}/month or ${formatPrice(CONTRACTOR_PRICES.annual)}/year`;

/** "$103.29 by card or $100 by CashApp". */
export const CONTRACTOR_LIFETIME_SUMMARY =
  `${formatPrice(CONTRACTOR_PRICES.lifetimeCard)} by card or ${formatPrice(CONTRACTOR_PRICES.lifetimeCashApp)} by CashApp`;
