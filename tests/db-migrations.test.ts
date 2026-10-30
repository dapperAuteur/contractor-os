// File: tests/db-migrations.test.ts
// Static checks that the Neon migrations, the copy plan and the Drizzle schema agree, and that the
// migrate script and workflow keep their guards (plan 18 Phase 2). No database. Run with
// `npm run test:db`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const MIG = 'db/migrations';

const journal = JSON.parse(read(`${MIG}/meta/_journal.json`)) as { entries: { tag: string }[] };
const sqlFiles = readdirSync(join(root, MIG)).filter((f) => f.endsWith('.sql')).sort();
const migrations = Object.fromEntries(sqlFiles.map((f) => [f, read(`${MIG}/${f}`)]));
const statements = (text: string) =>
  text
    .split('--> statement-breakpoint')
    .map((s) => s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim())
    .filter(Boolean);
const allStatements = Object.values(migrations).flatMap(statements);

const plan = JSON.parse(read('scripts/neon/copy-plan.json')) as {
  tables: { name: string }[];
  views: { name: string }[];
  pending: Record<string, string[]>;
};
const planTables = new Set(plan.tables.map((t) => t.name));
const baselineTables = new Set([...migrations['0000_baseline.sql'].matchAll(/^CREATE TABLE "([a-z0-9_]+)"/gm)].map((m) => m[1]));
const schemaTs = read('lib/db/schema/schema.ts');
const schemaTables = new Set([...schemaTs.matchAll(/pgTable\("([a-z0-9_]+)"/g)].map((m) => m[1]));
const schemaViews = new Set([...schemaTs.matchAll(/pgView\("([a-z0-9_]+)"/g)].map((m) => m[1]));

test('every migration file has a journal entry and every entry has a file', () => {
  assert.deepEqual(journal.entries.map((e) => `${e.tag}.sql`), sqlFiles);
});

test('the copy plan, the baseline and the Drizzle schema name the same tables', () => {
  assert.deepEqual([...baselineTables].sort(), [...planTables].sort());
  assert.deepEqual([...schemaTables].sort(), [...planTables].sort());
  assert.deepEqual([...schemaViews].sort(), plan.views.map((v) => v.name).sort());
});

test('tables waiting on BAM (task 21 Q3) are not in the schema yet', () => {
  for (const name of Object.values(plan.pending).flat()) {
    assert.equal(planTables.has(name), false, `${name} is both pending and planned`);
    assert.equal(schemaTables.has(name), false, `${name} is pending but in lib/db/schema`);
  }
});

test('no statement reads the Supabase auth schema or creates row-level security', () => {
  const bad = allStatements.filter((s) => /\bauth\.(uid|users|role|jwt)\b/.test(s) || /ROW LEVEL SECURITY|CREATE POLICY/i.test(s));
  assert.deepEqual(bad, []);
});

test('every foreign key is deferrable and points at a table the baseline creates', () => {
  const fks = statements(migrations['0001_constraints.sql']).filter((s) => /FOREIGN KEY/.test(s));
  assert.ok(fks.length > 100, `expected the full foreign-key set, found ${fks.length}`);
  for (const fk of fks) {
    assert.match(fk, /DEFERRABLE INITIALLY IMMEDIATE;$/, fk);
    const target = fk.match(/REFERENCES ([a-z0-9_]+)\(/)?.[1];
    assert.ok(target && baselineTables.has(target), `FK target ${target} is not created by 0000: ${fk}`);
  }
});

test('the users table exists and the old auth.users keys point at it', () => {
  assert.ok(baselineTables.has('users'));
  assert.ok(statements(migrations['0001_constraints.sql']).filter((s) => /REFERENCES users\(id\)/.test(s)).length >= 60);
});

test('the three auth.uid() functions take the user id, and expected_payments has the total_hours fix', () => {
  const fns = migrations['0002_functions_views.sql'];
  assert.match(fns, /toggle_blog_like\(p_post_id uuid, p_user_id uuid\)/);
  assert.match(fns, /toggle_blog_save\(p_post_id uuid, p_user_id uuid\)/);
  assert.match(fns, /is_contractor_job_member\(p_job_id uuid, p_user_id uuid\)/);
  assert.match(fns, /COALESCE\(te\.st_hours, te\.total_hours, 0::numeric\)/);
});

test('migrate.mjs refuses a Supabase target before connecting, without printing the string', () => {
  const fake = 'postgres://postgres.abcd:secretpw@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
  const run = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scripts/db/migrate.mjs'], {
    cwd: root,
    env: { NODE_ENV: 'test', PATH: process.env.PATH, STORAGE_DATABASE_URL_UNPOOLED: fake },
    encoding: 'utf8',
  });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Refusing to migrate: STORAGE_DATABASE_URL_UNPOOLED points at a Supabase host/);
  assert.ok(!`${run.stdout}${run.stderr}`.includes('secretpw'));
  assert.ok(!`${run.stdout}${run.stderr}`.includes('Target:'), 'it must refuse before reporting a target');
});

test('migrate.mjs fails with a clear message when no target is set', () => {
  const run = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scripts/db/migrate.mjs'], {
    cwd: root,
    env: { NODE_ENV: 'test', PATH: process.env.PATH, WORK_DB_URL: 'postgres://u:p@ep-x.us-east-1.aws.neon.tech/db' },
    encoding: 'utf8',
  });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /neither STORAGE_DATABASE_URL_UNPOOLED nor NEON_DIRECT_URL is set/);
});

test('the migrate workflow keeps the post-deploy rule: paths filter, dispatch, no-cancel concurrency, fail closed', () => {
  const wf = read('.github/workflows/migrate-production.yml');
  assert.match(wf, /paths:\s*\n\s*- "db\/migrations\/\*\*"/);
  assert.match(wf, /workflow_dispatch:/);
  assert.match(wf, /cancel-in-progress: false/);
  assert.match(wf, /::error::Set the repository secret/);
  assert.match(wf, /scripts\/db\/migrate\.mjs/);
  assert.doesNotMatch(wf, /SUPABASE/);
});
