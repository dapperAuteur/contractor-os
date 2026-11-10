// The ecosystem footer (witus public/brand/footer-recipe.md) on every public page, the 404 and the
// error boundary included: the sibling product list, the Rise Wellness callout with its verbatim
// disclaimer, and every link the old six-link footer and the home page's inline footer carried.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf-8');
const footer = read('components/ui/SiteFooter.tsx');

test('the footer lists the ecosystem products from the recipe', () => {
  for (const name of [
    'WitUS.online',
    'WitUS Inbox',
    'CentenarianOS',
    'Tour Manager OS',
    'Wanderlust',
    'Fly.WitUS',
    'FlashLearnAI',
    'Learn.WitUS',
    'AwesomeWebStore',
  ]) {
    assert.match(footer, new RegExp(`name: '${name.replace('.', '\\.')}'`), `${name} missing`);
  }
});

test('the footer keeps every link the old footers had', () => {
  // Column rows are data (`href: '/x'`); the legal links are JSX (`href="/x"`). Either form counts.
  for (const href of ['/terms', '/privacy', '/community', '/safety', '/blog', '/tech-roadmap', '/for', '/pricing', '/login']) {
    assert.match(footer, new RegExp(`href(?:: '|=")${href}['"]`), `${href} missing`);
  }
  assert.match(footer, /LEARN_WITUS_URL/);
  assert.match(footer, /https:\/\/centenarianos\.com/);
  assert.match(footer, /https:\/\/witus\.online/);
});

test('the footer carries the Rise Wellness callout with the verbatim disclaimer', () => {
  assert.match(footer, /Rise Wellness of Indiana/);
  assert.match(footer, /tel:\+13179650299/);
  assert.match(
    footer,
    /not affiliated with, employed by, or endorsed by Work\.WitUS,\s*CentenarianOS, B4C LLC, AwesomeWebStore\.com, or Anthony McDonald\./,
  );
});

test('the home page uses the shared footer instead of its own', () => {
  const home = read('app/page.tsx');
  assert.match(home, /<SiteFooter \/>/);
  assert.doesNotMatch(home, /<footer/);
});
