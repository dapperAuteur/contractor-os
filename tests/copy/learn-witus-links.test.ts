// tests/copy/learn-witus-links.test.ts
// Run: npm run test:copy
//
// Work.WitUS links to its guides on Learn.WitUS from one module (lib/ecosystem/learn-witus.mjs).
// This test checks the URL shapes against Learn.WitUS's routes and fails when a page types a
// Learn.WitUS URL of its own, or when /academy stops landing on the series page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  LEARN_WITUS_GUIDES, LEARN_WITUS_URL, WORK_WITUS_GUIDES_SERIES_URL,
} from '../../lib/ecosystem/learn-witus.mjs';

const ROOT = join(import.meta.dirname, '..', '..');

test('series and course URLs follow Learn.WitUS routes (/series/<slug>, /<username>/<courseSlug>)', () => {
  assert.equal(LEARN_WITUS_URL, 'https://learn.witus.online');
  assert.equal(WORK_WITUS_GUIDES_SERIES_URL, 'https://learn.witus.online/series/work-witus-guides');
  const urls = Object.values(LEARN_WITUS_GUIDES).map((g) => g.url);
  assert.deepEqual(urls.sort(), [
    'https://learn.witus.online/bam/work-witus-blog',
    'https://learn.witus.online/bam/work-witus-contractor-guide',
    'https://learn.witus.online/bam/work-witus-crewops-guide',
    'https://learn.witus.online/bam/work-witus-data-hub',
    'https://learn.witus.online/bam/work-witus-equipment',
    'https://learn.witus.online/bam/work-witus-finance',
    'https://learn.witus.online/bam/work-witus-settings-and-billing',
  ]);
});

test('the seven guides hold the 56 lessons the series was built with', () => {
  const total = Object.values(LEARN_WITUS_GUIDES).reduce((n, g) => n + g.lessons, 0);
  assert.equal(total, 56);
});

test('/academy redirects to the series page', () => {
  const config = readFileSync(join(ROOT, 'next.config.mjs'), 'utf8');
  assert.match(config, /source: '\/academy', destination: WORK_WITUS_GUIDES_SERIES_URL/);
  assert.match(config, /source: '\/academy\/:path\*', destination: WORK_WITUS_GUIDES_SERIES_URL/);
});

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(tsx?|mjs)$/.test(name) && rel !== 'lib/ecosystem/learn-witus.mjs') out.push(rel);
  }
  return out;
}

function linesMatching(pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const file of ['app', 'components', 'lib'].flatMap(sourceFiles)) {
    readFileSync(join(ROOT, file), 'utf8').split('\n').forEach((line, i) => {
      if (pattern.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  return hits;
}

test('no page types a Learn.WitUS URL of its own', () => {
  const offenders = linesMatching(/['"`]https:\/\/learn\.witus\.online/);
  assert.deepEqual(offenders, [], `Use lib/ecosystem/learn-witus.mjs instead:\n${offenders.join('\n')}`);
});

test('nothing still says the guides are "moving to" Learn.WitUS', () => {
  const offenders = linesMatching(/(moving|move) to Learn\.WitUS/i);
  assert.deepEqual(offenders, [], offenders.join('\n'));
});
