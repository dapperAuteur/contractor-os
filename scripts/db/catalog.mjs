// scripts/db/catalog.mjs
// Read a Postgres schema's catalog as JSON through psql, for generate-baseline.mjs and
// compare-schema.mjs (plan 18 Phase 2).
//
// WHY psql AND NOT pg: Supabase signs its certificates with its own root CA, which node-postgres
// verifies and rejects without that CA (lib/db/url.ts). psql is what CentOS's
// scripts/phase3-generate-ddl.sh used for the same job.
//
// SAFETY
// - The connection string never reaches the command line or the output: it is split into PG*
//   environment variables for the psql child, and errors are scrubbed of anything URL-shaped.
// - readOnly: the session runs `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`, then a DO
//   block that raises unless transaction_read_only is on, before the catalog query. PGOPTIONS is not
//   used because Supabase's pooler ignores it (checked 2026-10-30: the setting stayed off).

import { spawnSync } from 'node:child_process';

const NAME = /^[a-z_][a-z0-9_]*$/;

export function scrub(text) {
  return String(text).replace(/postgres(ql)?:\/\/\S+/g, '<connection string>');
}

/** PG* variables for psql from a postgres:// URL. */
export function pgEnvFromUrl(url) {
  const u = new URL(url);
  const env = {
    PGHOST: u.searchParams.get('host') || u.hostname,
    PGPORT: u.port || '5432',
    PGDATABASE: decodeURIComponent(u.pathname.replace(/^\//, '')) || 'postgres',
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGSSLMODE: u.searchParams.get('sslmode') || 'require',
    PGCONNECT_TIMEOUT: '20',
    PGAPPNAME: 'contractor-os-schema-tools',
  };
  const cb = u.searchParams.get('channel_binding');
  if (cb) env.PGCHANNELBINDING = cb;
  return env;
}

/** Run one SQL statement that returns a single JSON value; parse it. */
export function psqlJson(url, sql, { readOnly }) {
  const args = ['-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1'];
  if (readOnly) {
    args.push('-c', 'SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
    args.push(
      '-c',
      "DO $$ BEGIN IF current_setting('transaction_read_only') <> 'on' THEN RAISE EXCEPTION 'session is not read-only'; END IF; END $$",
    );
  }
  args.push('-c', 'SET search_path = public');
  args.push('-c', sql);
  const res = spawnSync('psql', args, {
    env: { ...process.env, ...pgEnvFromUrl(url) },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.error) throw new Error(`psql could not start: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`psql failed: ${scrub(res.stderr).trim()}`);
  const out = res.stdout.trim().split('\n').filter((l) => !/^(SET|DO)$/.test(l.trim())).join('\n');
  return JSON.parse(out);
}

function sqlArray(names) {
  for (const n of names) if (!NAME.test(n)) throw new Error(`Unexpected identifier in copy plan: ${n}`);
  return `ARRAY[${names.map((n) => `'${n}'`).join(',')}]::text[]`;
}

/** One query that returns tables (columns, constraints, indexes, triggers, policies), views, functions. */
export function catalogQuery({ tables, views, functions }) {
  return `
WITH t AS (
  SELECT c.oid, c.relname, c.relrowsecurity FROM pg_class c
  WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND c.relname = ANY(${sqlArray(tables)})
)
SELECT json_build_object(
  'tables', COALESCE((SELECT json_agg(json_build_object(
    'name', t.relname,
    'rls', t.relrowsecurity,
    'columns', (SELECT json_agg(json_build_object(
        'name', a.attname,
        'type', format_type(a.atttypid, a.atttypmod),
        'default', pg_get_expr(d.adbin, d.adrelid),
        'notnull', a.attnotnull,
        'identity', a.attidentity,
        'generated', a.attgenerated) ORDER BY a.attnum)
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped),
    'constraints', COALESCE((SELECT json_agg(json_build_object(
        'name', k.conname, 'type', k.contype, 'def', pg_get_constraintdef(k.oid),
        'target', CASE WHEN k.contype = 'f' THEN k.confrelid::regclass::text END) ORDER BY k.conname)
      FROM pg_constraint k WHERE k.conrelid = t.oid AND k.contype <> 'n'), '[]'::json),
    'indexes', COALESCE((SELECT json_agg(json_build_object('name', ic.relname, 'def', pg_get_indexdef(i.indexrelid)) ORDER BY ic.relname)
      FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid
      WHERE i.indrelid = t.oid AND NOT EXISTS (
        SELECT 1 FROM pg_constraint k WHERE k.conrelid = t.oid AND k.conindid = i.indexrelid AND k.contype IN ('p','u','x'))), '[]'::json),
    'triggers', COALESCE((SELECT json_agg(json_build_object('name', tg.tgname, 'def', pg_get_triggerdef(tg.oid), 'function', p.proname) ORDER BY tg.tgname)
      FROM pg_trigger tg JOIN pg_proc p ON p.oid = tg.tgfoid WHERE tg.tgrelid = t.oid AND NOT tg.tgisinternal), '[]'::json),
    'policies', COALESCE((SELECT json_agg(json_build_object('name', pol.policyname, 'cmd', pol.cmd, 'using', pol.qual, 'check', pol.with_check) ORDER BY pol.policyname)
      FROM pg_policies pol WHERE pol.schemaname = 'public' AND pol.tablename = t.relname), '[]'::json)
  ) ORDER BY t.relname) FROM t), '[]'::json),
  'views', COALESCE((SELECT json_agg(json_build_object('name', c.relname, 'def', pg_get_viewdef(c.oid, true), 'options', c.reloptions) ORDER BY c.relname)
    FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'v' AND c.relname = ANY(${sqlArray(views)})), '[]'::json),
  'functions', COALESCE((SELECT json_agg(json_build_object('name', p.proname, 'signature', p.oid::regprocedure::text, 'def', pg_get_functiondef(p.oid)) ORDER BY p.proname, p.oid::regprocedure::text)
    FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = ANY(${sqlArray(functions)})), '[]'::json)
)`;
}

/** Load scripts/neon/copy-plan.json's table and view names. `users` is created by the baseline, not read. */
export async function loadCopyPlan(root) {
  const { readFile } = await import('node:fs/promises');
  const plan = JSON.parse(await readFile(new URL('scripts/neon/copy-plan.json', root), 'utf8'));
  return {
    plan,
    tables: plan.tables.map((t) => t.name).filter((n) => n !== 'users'),
    views: plan.views.map((v) => v.name),
  };
}

/** Functions plan 18 §2.4 recreates: trigger functions on the moved tables, plus the six RPCs. */
export const FUNCTIONS = [
  'update_updated_at_column',
  'set_updated_at',
  'budget_categories_life_area_owner_check',
  'profiles_protect_privileged_columns',
  'get_post_id_by_slug',
  'log_blog_event',
  'toggle_blog_like',
  'toggle_blog_save',
  'match_help_articles',
  'match_union_chunks',
  'is_contractor_job_member',
];
