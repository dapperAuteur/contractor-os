#!/usr/bin/env node
// scripts/db/generate-baseline.mjs
// Build Work.WitUS's first three Neon migrations from the LIVE Supabase schema (plan 18 Phase 2):
//
//   db/migrations/0000_baseline.sql         extensions, the new users table, every table in
//                                           scripts/neon/copy-plan.json: columns only, no keys
//   db/migrations/0001_constraints.sql      primary, unique, check and foreign keys, then indexes
//   db/migrations/0002_functions_views.sql  the functions plan 18 §2.4 keeps, triggers, views
//
// It adapts CentOS scripts/phase3-neonize.mjs (same idea: let Postgres print its own DDL, then
// apply a few deliberate transforms) to plan 18's table list. The transforms, each a decision:
//
//   IDENTITY   Every `REFERENCES auth.users(id)` becomes `REFERENCES users(id)`. `users` is new:
//              its ids are the old auth.users ids (copied in Phase 4), so every foreign-key value
//              stays valid. Change from plan 55 / phase3-neonize.mjs, which pointed them at
//              profiles(id) (plan 18 §2.3).
//   DEFERRABLE Every foreign key is DEFERRABLE INITIALLY IMMEDIATE, so the Phase 4 copy can load
//              tables in any order inside one transaction with SET CONSTRAINTS ALL DEFERRED, while
//              the app still gets immediate checks.
//   ORDERING   Tables first (0000), then keys (primary/unique before foreign), then indexes (0001):
//              no topological sort of ~90 tables needed.
//   DANGLING   A foreign key whose target is not in the copy plan is dropped; the column stays as
//              a soft reference. Listed at the end of 0001.
//   RLS        Not created (plan 18 §2.4). Every ported query filters by the session user instead.
//              The Supabase policies are listed as comments at the end of 0001 for reference.
//   EXTENSIONS `extensions.` prefixes are removed (Supabase keeps pgcrypto in an `extensions`
//              schema; Neon creates it in public).
//   auth.uid() Functions that read the Supabase session (toggle_blog_like, toggle_blog_save,
//              is_contractor_job_member) take the user id as a parameter instead.
//   VIEW FIX   expected_payments counts total_hours when no straight-time split was entered
//              (plan 55 §4c; CentOS supabase/neon/001_expected_payments.sql).
//
// Usage (read-only against Supabase; it writes only the three local files):
//   node --env-file=.env.local scripts/db/generate-baseline.mjs
//   node --env-file=.env.local scripts/db/generate-baseline.mjs --check   # exit 1 if the files differ
//   ... --source-env=NAME   env var holding the Supabase DIRECT/session string
//                           (default SUPABASE_CONTRACTOR__POSTGRES_URL_NON_POOLING)
//
// Once a migration has been applied to Neon `main`, do not regenerate it: a change to the schema is a
// NEW migration (`npm run db:generate` after editing lib/db/schema). `--check` is still useful to see
// whether Supabase has drifted from what 0000-0002 recorded.

import { readFile, writeFile } from 'node:fs/promises';
import { psqlJson, catalogQuery, loadCopyPlan, FUNCTIONS, scrub } from './catalog.mjs';
import { isSupabaseUrl } from '../../lib/db/url.ts';

const ROOT = new URL('../../', import.meta.url);
const OUT = {
  baseline: 'db/migrations/0000_baseline.sql',
  constraints: 'db/migrations/0001_constraints.sql',
  functions: 'db/migrations/0002_functions_views.sql',
};
const BP = '\n--> statement-breakpoint\n';

const args = process.argv.slice(2);
const check = args.includes('--check');
const sourceEnv = (args.find((a) => a.startsWith('--source-env=')) || '').split('=')[1] || 'SUPABASE_CONTRACTOR__POSTGRES_URL_NON_POOLING';

function fail(msg) {
  console.error(`generate-baseline: ${scrub(msg)}`);
  process.exit(1);
}

const q = (id) => `"${id.replace(/"/g, '""')}"`;
const noExtensions = (s) => (s == null ? s : s.replace(/\bextensions\./g, ''));

/** Replace `from` with `to`, requiring exactly `count` occurrences. */
function replaceExactly(text, from, to, count, label) {
  const found = text.split(from).length - 1;
  if (found !== count) fail(`${label}: expected ${count} occurrence(s) of ${JSON.stringify(from)}, found ${found}. Supabase changed; review the transform.`);
  return text.split(from).join(to);
}

// ── The users table: Better Auth's core user columns (Phase 5) plus last_sign_in_at. ──────────────
const USERS_TABLE = `CREATE TABLE "users" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "name" text DEFAULT ''::text NOT NULL,
  "image" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_sign_in_at" timestamp with time zone
);`;
const USERS_KEYS = [
  'ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);',
  'ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE (email);',
];

function columnSql(table, c) {
  let line = `  ${q(c.name)} ${noExtensions(c.type)}`;
  if (c.identity === 'a') line += ' GENERATED ALWAYS AS IDENTITY';
  else if (c.identity === 'd') line += ' GENERATED BY DEFAULT AS IDENTITY';
  if (c.generated === 's') {
    line += ` GENERATED ALWAYS AS (${noExtensions(c.default)}) STORED`;
  } else if (c.default != null) {
    if (/\bauth\./.test(c.default)) fail(`${table}.${c.name} default reads the Supabase auth schema: ${c.default}`);
    line += ` DEFAULT ${noExtensions(c.default)}`;
  }
  if (c.notnull) line += ' NOT NULL';
  return line;
}

function build(cat, copyPlan) {
  const wanted = new Set(copyPlan.tables);
  const got = new Set(cat.tables.map((t) => t.name));
  const missing = [...wanted].filter((n) => !got.has(n));
  if (missing.length) fail(`tables in the copy plan that Supabase does not have: ${missing.join(', ')}`);
  const missingViews = copyPlan.views.filter((v) => !cat.views.some((x) => x.name === v));
  if (missingViews.length) fail(`views missing on Supabase: ${missingViews.join(', ')}`);
  const fnNames = new Set(cat.functions.map((f) => f.name));
  const missingFns = FUNCTIONS.filter((f) => !fnNames.has(f));
  if (missingFns.length) fail(`functions missing on Supabase: ${missingFns.join(', ')}`);

  const targets = new Set([...wanted, 'users']);

  // ── 0000: tables ───────────────────────────────────────────────────────────────────────────────
  const creates = [USERS_TABLE];
  let columnCount = 0;
  for (const t of cat.tables) {
    columnCount += t.columns.length;
    creates.push(`CREATE TABLE ${q(t.name)} (\n${t.columns.map((c) => columnSql(t.name, c)).join(',\n')}\n);`);
  }

  // ── 0001: constraints and indexes ──────────────────────────────────────────────────────────────
  const rank = { p: 0, u: 1, x: 1, c: 2, f: 3 };
  const keys = [];
  const dangling = [];
  let authRefs = 0;
  for (const t of cat.tables) {
    for (const k of t.constraints) {
      if (!(k.type in rank)) fail(`${t.name}.${k.name}: unsupported constraint type ${k.type}`);
      let def = noExtensions(k.def);
      if (k.type === 'f') {
        if (k.target === 'auth.users') {
          def = replaceExactly(def, 'REFERENCES auth.users(', 'REFERENCES users(', 1, `${t.name}.${k.name}`);
          authRefs++;
        } else if (!targets.has(k.target)) {
          dangling.push(`${t.name}.${k.name} -> ${k.target}: ${k.def}`);
          continue;
        }
        if (!/DEFERRABLE/.test(def)) def += ' DEFERRABLE INITIALLY IMMEDIATE';
      } else if (/\bauth\./.test(def)) {
        fail(`${t.name}.${k.name} reads the Supabase auth schema: ${k.def}`);
      }
      keys.push({ rank: rank[k.type], sql: `ALTER TABLE ${q(t.name)} ADD CONSTRAINT ${q(k.name)} ${def};` });
    }
  }
  keys.sort((a, b) => a.rank - b.rank);
  const indexes = cat.tables.flatMap((t) => t.indexes.map((i) => `${noExtensions(i.def)};`));
  const policies = cat.tables.flatMap((t) =>
    t.policies.map((p) => `-- ${t.name} :: ${p.name} :: ${p.cmd} :: using ${p.using ?? '-'} :: check ${p.check ?? '-'}`.replace(/\s+/g, ' ')),
  );

  // ── 0002: functions, triggers, views ───────────────────────────────────────────────────────────
  const fnSql = [];
  for (const f of cat.functions) {
    let def = noExtensions(f.def).trim();
    if (f.name === 'toggle_blog_like' || f.name === 'toggle_blog_save') {
      def = replaceExactly(def, `public.${f.name}(p_post_id uuid)`, `public.${f.name}(p_post_id uuid, p_user_id uuid)`, 1, f.name);
      def = replaceExactly(def, 'v_user_id UUID := auth.uid();', 'v_user_id UUID := p_user_id;', 1, f.name);
    }
    if (f.name === 'is_contractor_job_member') {
      def = replaceExactly(def, 'public.is_contractor_job_member(p_job_id uuid)', 'public.is_contractor_job_member(p_job_id uuid, p_user_id uuid)', 1, f.name);
      def = def.replace(/auth\.uid\(\)/g, 'p_user_id');
    }
    if (/\bauth\./.test(def)) fail(`function ${f.signature} still reads the Supabase auth schema after the transforms`);
    fnSql.push(`${def};`);
  }
  const triggers = cat.tables.flatMap((t) =>
    t.triggers.map((tg) => {
      if (!FUNCTIONS.includes(tg.function)) fail(`trigger ${t.name}.${tg.name} calls ${tg.function}, which the baseline does not create`);
      return `${tg.def};`;
    }),
  );
  const viewSql = [];
  for (const name of copyPlan.views) {
    const v = cat.views.find((x) => x.name === name);
    let def = v.def.trim().replace(/;$/, '');
    if (name === 'expected_payments') {
      def = replaceExactly(
        def,
        'COALESCE(te.st_hours, 0::numeric) * COALESCE(j.pay_rate, 0::numeric)',
        'COALESCE(te.st_hours, te.total_hours, 0::numeric) * COALESCE(j.pay_rate, 0::numeric)',
        1,
        'expected_payments view',
      );
    }
    const opts = v.options?.length ? ` WITH (${v.options.join(', ')})` : '';
    viewSql.push(`CREATE VIEW ${q(name)}${opts} AS\n${def};`);
  }

  const leftover = [...creates, ...keys.map((k) => k.sql), ...indexes, ...fnSql, ...triggers, ...viewSql].filter((s) => /\bauth\.(uid|users|role|jwt)\b/.test(s));
  if (leftover.length) fail(`${leftover.length} statement(s) still reference the Supabase auth schema`);

  const baseline = [
    `-- db/migrations/0000_baseline.sql
-- GENERATED by scripts/db/generate-baseline.mjs from the live Supabase schema. Do not hand-edit.
-- Plan 18 Phase 2. Tables only: ${cat.tables.length} from scripts/neon/copy-plan.json plus the new users
-- table, ${columnCount} columns. No keys, foreign keys or indexes here (0001), no functions or views (0002).
-- Identity columns start at 1; the Phase 4 copy sets each sequence past the copied rows.
-- Generated (STORED) columns are recomputed by Postgres; the Phase 4 copy leaves them out.
CREATE EXTENSION IF NOT EXISTS vector;`,
    'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
    ...creates,
  ].join(BP);

  const constraints = [
    `-- db/migrations/0001_constraints.sql
-- GENERATED by scripts/db/generate-baseline.mjs. Do not hand-edit.
-- ${keys.length} constraints (primary and unique keys before foreign keys) and ${indexes.length} indexes.
-- ${authRefs} foreign keys to auth.users now reference users(id); every foreign key is
-- DEFERRABLE INITIALLY IMMEDIATE for the Phase 4 copy. ${dangling.length} foreign key(s) dropped because the
-- target stays out of Neon (listed at the end). Row-level security is not created (plan 18 §2.4).
${USERS_KEYS[0]}`,
    USERS_KEYS[1],
    ...keys.map((k) => k.sql),
    ...indexes,
  ].join(BP) +
    `\n\n-- ── Foreign keys dropped: target not in scripts/neon/copy-plan.json (column kept) ──\n` +
    dangling.map((d) => `-- ${d}`).join('\n') +
    `\n\n-- ── Supabase RLS policies on these tables, for reference only (${policies.length}); not created ──\n` +
    policies.join('\n') +
    '\n';

  const functions = [
    `-- db/migrations/0002_functions_views.sql
-- GENERATED by scripts/db/generate-baseline.mjs. Do not hand-edit.
-- ${fnSql.length} functions (plan 18 §2.4), ${triggers.length} triggers, ${viewSql.length} views.
-- Changed from Supabase on purpose:
--   toggle_blog_like(p_post_id, p_user_id), toggle_blog_save(p_post_id, p_user_id) and
--   is_contractor_job_member(p_job_id, p_user_id) take the user id; Neon has no auth.uid().
--   expected_payments counts total_hours when no straight-time split was entered (plan 55 §4c).
--   profiles_protect_privileged_columns is kept but inert: it only acts for the Supabase browser
--   roles (anon, authenticated), which do not exist on Neon. The app is the only writer there.
${fnSql[0]}`,
    ...fnSql.slice(1),
    ...triggers,
    ...viewSql,
  ].join(BP) + '\n';

  return {
    files: { [OUT.baseline]: baseline + '\n', [OUT.constraints]: constraints, [OUT.functions]: functions },
    stats: { tables: cat.tables.length + 1, columns: columnCount, constraints: keys.length + 2, authRefs, dangling, indexes: indexes.length, functions: fnSql.length, triggers: triggers.length, views: viewSql.length, policies: policies.length },
  };
}

async function main() {
  const url = process.env[sourceEnv]?.trim();
  if (!url) fail(`${sourceEnv} is not set. Run with node --env-file=.env.local.`);
  if (!isSupabaseUrl(url)) fail(`${sourceEnv} is not a Supabase host; this script reads the live Supabase schema.`);
  const copyPlan = await loadCopyPlan(ROOT);
  const cat = psqlJson(url, catalogQuery({ ...copyPlan, functions: FUNCTIONS }), { readOnly: true });
  const { files, stats } = build(cat, copyPlan);

  if (check) {
    const differ = [];
    for (const [path, text] of Object.entries(files)) {
      const current = await readFile(new URL(path, ROOT), 'utf8').catch(() => null);
      if (current !== text) differ.push(path);
    }
    if (differ.length) {
      console.error(`Supabase differs from the committed baseline in: ${differ.join(', ')}`);
      process.exit(1);
    }
    console.log('The committed baseline matches the live Supabase schema.');
    return;
  }
  for (const [path, text] of Object.entries(files)) await writeFile(new URL(path, ROOT), text);
  console.log(JSON.stringify({ ...stats, dangling: stats.dangling.length }, null, 2));
  for (const d of stats.dangling) console.log(`dropped FK: ${d.split(':')[0]}`);
  console.log(`wrote ${Object.values(OUT).join(', ')}`);
}

main().catch((e) => fail(e.message));
