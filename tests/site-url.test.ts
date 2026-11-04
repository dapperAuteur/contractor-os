// File: tests/site-url.test.ts
// lib/site-url.ts: the app's own origin, its fallbacks, and the foreign-origin warning.
// Run with `npm run test:sync`.
//
// Context: on 2026-11-04 production's NEXT_PUBLIC_SITE_URL was https://www.centenarianos.com, and
// the code's fallbacks named https://work.witus.com, a domain this app never had.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEVELOPMENT_SITE_URL,
  PRODUCTION_SITE_URL,
  foreignSiteUrlWarning,
  isOwnOrigin,
  parseConfiguredOrigin,
  resetSiteUrlWarningForTests,
  resolveSiteUrl,
  warnIfForeignSiteUrl,
} from '../lib/site-url.ts';

test('the production default is the host the WitUS IdP registered', () => {
  assert.equal(PRODUCTION_SITE_URL, 'https://work.witus.online');
  assert.equal(DEVELOPMENT_SITE_URL, 'http://localhost:3000');
});

test('a configured value wins, normalized to its origin', () => {
  assert.equal(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://work.witus.online/', VERCEL_ENV: 'production' }), 'https://work.witus.online');
  assert.equal(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: ' https://www.badcba.com ' }), 'https://www.badcba.com');
});

test('fallbacks per environment', () => {
  assert.equal(resolveSiteUrl({ VERCEL_ENV: 'production', NODE_ENV: 'production' }), PRODUCTION_SITE_URL);
  assert.equal(resolveSiteUrl({ VERCEL_ENV: 'preview', VERCEL_URL: 'contractor-os-abc.vercel.app', NODE_ENV: 'production' }), 'https://contractor-os-abc.vercel.app');
  assert.equal(resolveSiteUrl({ NODE_ENV: 'development' }), DEVELOPMENT_SITE_URL);
  assert.equal(resolveSiteUrl({}), DEVELOPMENT_SITE_URL);
  assert.equal(resolveSiteUrl({ NODE_ENV: 'production' }), PRODUCTION_SITE_URL);
  // Empty or malformed configured values fall back instead of producing "undefined/..." links.
  assert.equal(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: '', VERCEL_ENV: 'production' }), PRODUCTION_SITE_URL);
  assert.equal(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'work.witus.online', NODE_ENV: 'development' }), DEVELOPMENT_SITE_URL);
});

test('own hosts', () => {
  for (const o of ['https://work.witus.online', 'https://www.badcba.com', 'http://localhost:3000', 'http://127.0.0.1:3000', 'https://contractor-os-git-x.vercel.app']) {
    assert.equal(isOwnOrigin(o), true, o);
  }
  for (const o of ['https://www.centenarianos.com', 'https://work.witus.com', 'https://witus.online', 'https://vercel.app.evil.com']) {
    assert.equal(isOwnOrigin(o), false, o);
  }
});

test('a CentenarianOS URL produces a warning naming the host; our hosts do not', () => {
  const w = foreignSiteUrlWarning({ NEXT_PUBLIC_SITE_URL: 'https://www.centenarianos.com' });
  assert.match(w ?? '', /www\.centenarianos\.com/);
  assert.match(w ?? '', /https:\/\/work\.witus\.online/);
  assert.equal(foreignSiteUrlWarning({ NEXT_PUBLIC_SITE_URL: 'https://work.witus.online' }), null);
  assert.equal(foreignSiteUrlWarning({}), null);
  assert.match(foreignSiteUrlWarning({ NEXT_PUBLIC_SITE_URL: 'not a url' }) ?? '', /not a valid URL/);
});

test('the warning is logged once per process', () => {
  resetSiteUrlWarningForTests();
  const logged: string[] = [];
  const env = { NEXT_PUBLIC_SITE_URL: 'https://www.centenarianos.com' };
  warnIfForeignSiteUrl(env, (m) => logged.push(m));
  warnIfForeignSiteUrl(env, (m) => logged.push(m));
  assert.equal(logged.length, 1);
  resetSiteUrlWarningForTests();
});

test('parseConfiguredOrigin', () => {
  assert.equal(parseConfiguredOrigin(undefined), null);
  assert.equal(parseConfiguredOrigin('  '), null);
  assert.equal(parseConfiguredOrigin('https://work.witus.online/some/path'), 'https://work.witus.online');
});

// ── source guards ───────────────────────────────────────────────────────────────────────────────

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(p);
  }
  return out;
}

const sources = ['app', 'lib', 'components'].flatMap((d) => walk(d));

test('no code names work.witus.com', () => {
  const hits = sources.filter((f) => f !== join('lib', 'site-url.ts') && readFileSync(f, 'utf8').includes('work.witus.com'));
  assert.deepEqual(hits, []);
});

test('NEXT_PUBLIC_SITE_URL is read only in lib/site-url.ts', () => {
  const hits = sources.filter((f) => {
    if (f === join('lib', 'site-url.ts')) return false;
    // Comments may mention the variable; code may not read it.
    return /process\.env\.NEXT_PUBLIC_SITE_URL/.test(readFileSync(f, 'utf8'));
  });
  assert.deepEqual(hits, []);
});

test('the SSO redirect_uri comes from the configured value, never the request host', () => {
  for (const f of ['app/api/auth/witus/authorize/route.ts', 'app/api/auth/witus/callback/route.ts', 'lib/auth/witus-sso-server.ts']) {
    const src = readFileSync(f, 'utf8');
    assert.match(src, /getConfiguredSiteUrl\(\)/, f);
    assert.doesNotMatch(src, /getSiteUrl\(\)/, f);
    assert.doesNotMatch(src, /siteUrl\s*=.*(url\.origin|request\.url|headers)/, f);
  }
});
