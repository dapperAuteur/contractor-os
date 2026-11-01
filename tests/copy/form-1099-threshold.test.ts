// tests/copy/form-1099-threshold.test.ts
// Run: npm run test:copy
//
// The Reports page's 1099 badge uses the threshold for the tax year being reported: $600 through
// 2025, $2,000 from 2026 (IRS Instructions for Forms 1099-MISC and 1099-NEC, fetched 2026-11-01).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FORM_1099_HELP_SENTENCE, form1099Threshold, formatThreshold, isForm1099ThresholdConfirmed,
  meetsForm1099Threshold,
} from '../../lib/contractor/form-1099.ts';

const ROOT = join(import.meta.dirname, '..', '..');

test('tax year 2025 and earlier: $600', () => {
  assert.equal(form1099Threshold(2025), 600);
  assert.equal(form1099Threshold(2020), 600);
  assert.equal(meetsForm1099Threshold(600, 2025), true);
  assert.equal(meetsForm1099Threshold(599.99, 2025), false);
  assert.equal(meetsForm1099Threshold(1500, 2025), true);
});

test('tax year 2026: $2,000', () => {
  assert.equal(form1099Threshold(2026), 2000);
  assert.equal(meetsForm1099Threshold(1500, 2026), false, 'a $1,500 client no longer gets a badge in 2026');
  assert.equal(meetsForm1099Threshold(1999.99, 2026), false);
  assert.equal(meetsForm1099Threshold(2000, 2026), true);
});

test('years after the last confirmed one carry $2,000 forward and are marked unconfirmed', () => {
  assert.equal(form1099Threshold(2027), 2000);
  assert.equal(isForm1099ThresholdConfirmed(2025), true);
  assert.equal(isForm1099ThresholdConfirmed(2026), true);
  assert.equal(isForm1099ThresholdConfirmed(2027), false);
});

test('help text states both amounts', () => {
  assert.equal(formatThreshold(2000), '$2,000');
  assert.match(FORM_1099_HELP_SENTENCE, /\$600 per client for 2025 and earlier/);
  assert.match(FORM_1099_HELP_SENTENCE, /\$2,000 for 2026 and later/);
});

test('the reports route and page use the tax-year threshold, not a fixed number', () => {
  const route = readFileSync(join(ROOT, 'app/api/contractor/reports/route.ts'), 'utf8');
  const page = readFileSync(join(ROOT, 'app/dashboard/contractor/reports/page.tsx'), 'utf8');
  const help = readFileSync(join(ROOT, 'lib/help/articles.ts'), 'utf8');
  assert.match(route, /meetsForm1099Threshold\(c\.total_paid, year\)/);
  for (const [name, src] of [['route', route], ['page', page], ['help', help]] as const) {
    assert.doesNotMatch(src, /\$600\b|>=\s*600\b/, `${name} still hardcodes $600`);
  }
});
