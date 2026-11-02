// tests/copy/pricing-consistency.test.ts
// Run: npm run test:copy
//
// Every page that shows a Work.WitUS or CrewOps price reads it from lib/pricing/prices.ts, so two
// pages cannot disagree. This test fails when a page types a price of its own (the 2026-11-01 bug:
// billing said $10/month and $100 lifetime while pricing charged $10.60 and $103.29), or when the
// one source drifts from the prices BAM confirmed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  CONTRACTOR_PRICES, LISTER_PRICES, CONTRACTOR_PRICE_SUMMARY, CONTRACTOR_LIFETIME_SUMMARY,
  annualSavings, formatPrice, formatPriceCents, perMonthOfAnnual,
} from '../../lib/pricing/prices.ts';

const ROOT = join(import.meta.dirname, '..', '..');

test('the one source holds the prices BAM confirmed on 2026-11-01', () => {
  assert.equal(CONTRACTOR_PRICES.monthly, 10.6);
  assert.equal(CONTRACTOR_PRICES.lifetimeCard, 103.29);
  assert.equal(CONTRACTOR_PRICES.lifetimeCashApp, 100);
});

test('formatters print what the pages show', () => {
  assert.equal(formatPrice(10.6), '$10.60');
  assert.equal(formatPrice(100), '$100');
  assert.equal(formatPriceCents(100), '$100.00');
  assert.equal(perMonthOfAnnual(103.29), '$8.61');
  assert.equal(annualSavings(10.6, 103.29), '$23.91');
  assert.equal(CONTRACTOR_PRICE_SUMMARY, '$10.60/month or $103.29/year');
  assert.equal(CONTRACTOR_LIFETIME_SUMMARY, '$103.29 by card or $100 by CashApp');
});

// Every value a page could show, as it would be typed by hand: "$10", "$10.60", "$100", "$103.29",
// "$50", "$500", or a bare 10.60 / 103.29 in code. Each must come from lib/pricing/prices.ts instead.
const priceValues = new Set<number>([...Object.values(CONTRACTOR_PRICES), ...Object.values(LISTER_PRICES), 10]);
const dollarAmounts = [...priceValues].map((v) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', '\\.')));
const HARDCODED_PRICE = new RegExp(
  `\\$\\s?(?:${dollarAmounts.join('|')})(?:\\.0+)?(?![\\d.,])|\\b(?:10\\.60?|103\\.29)\\b`,
);

// Folders that hold pages, components, emails and help text. lib/demo is sample data (equipment
// purchase prices, parking fees), not product pricing.
const SCANNED = ['app', 'components', 'lib'];
const SKIPPED = new Set(['lib/pricing', 'lib/demo']);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (SKIPPED.has(rel)) continue;
    const full = join(ROOT, rel);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(tsx?|mjs|js|md)$/.test(name)) out.push(rel);
  }
  return out;
}

test('no page, component, email or help article types a price of its own', () => {
  const offenders: string[] = [];
  for (const file of SCANNED.flatMap(sourceFiles)) {
    const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (HARDCODED_PRICE.test(line)) offenders.push(`${relative(ROOT, join(ROOT, file))}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `These lines type a price instead of reading lib/pricing/prices.ts:\n${offenders.join('\n')}`,
  );
});

// The pages that show prices today. Each must import the one source; a page that drops the import
// has gone back to typing its own numbers (or stopped showing prices, in which case remove it here).
const PRICE_PAGES = [
  'app/pricing/page.tsx',
  'app/lister-pricing/page.tsx',
  'app/dashboard/billing/page.tsx',
  'app/page.tsx',
  'app/for/[slug]/page.tsx',
  'app/lister-landing/page.tsx',
  'app/tech-roadmap/page.tsx',
  'app/admin/page.tsx',
  'app/api/admin/stats/route.ts',
  'app/api/contractor/cashapp/route.ts',
  'lib/help/articles.ts',
];

test('every page that shows a price reads lib/pricing/prices.ts', () => {
  for (const file of PRICE_PAGES) {
    const src = readFileSync(join(ROOT, file), 'utf8');
    assert.match(src, /from ['"](?:@\/lib|\.\.)\/pricing\/prices['"]/, `${file} does not import lib/pricing/prices`);
  }
});

test('billing and pricing show the same monthly and lifetime prices', () => {
  const billing = readFileSync(join(ROOT, 'app/dashboard/billing/page.tsx'), 'utf8');
  const pricing = readFileSync(join(ROOT, 'app/pricing/page.tsx'), 'utf8');
  for (const [name, src] of [['billing', billing], ['pricing', pricing]] as const) {
    assert.match(src, /CONTRACTOR_PRICES\.monthly/, `${name} does not show CONTRACTOR_PRICES.monthly`);
    assert.match(
      src,
      /CONTRACTOR_PRICES\.lifetimeCard|CONTRACTOR_LIFETIME_SUMMARY/,
      `${name} does not show the card lifetime price`,
    );
  }
});
