#!/usr/bin/env node
// scripts/db/compare-schema.mjs
// Compare the live Supabase schema with a Neon branch, table by table, for every table and view in
// scripts/neon/copy-plan.json (plan 18 Phase 2 verification; re-run before the Phase 4 rehearsal and
// the Phase 7 cutover to catch Supabase drift). Both sides are read-only.
//
// Compared: columns (type, default, not null, identity, generated), constraints (definition),
// indexes (definition), triggers, view definitions and function definitions. The deliberate
// differences that generate-baseline.mjs makes (auth.users -> users, DEFERRABLE, `extensions.`,
// the three auth.uid() functions, the expected_payments fix) are normalized away, so any line this
// prints is a real difference. Exit 1 when there is one.
//
// Usage:
//   node --env-file=.env.local scripts/db/compare-schema.mjs
//   ... --source-env=NAME   Supabase direct/session string (default SUPABASE_CONTRACTOR__POSTGRES_URL_NON_POOLING)
//   ... --target-env=NAME   Neon string (default STORAGE_DATABASE_URL_UNPOOLED)

import { psqlJson, catalogQuery, loadCopyPlan, FUNCTIONS, scrub } from './catalog.mjs';
import { isSupabaseUrl } from '../../lib/db/url.ts';

const ROOT = new URL('../../', import.meta.url);
const arg = (name, dflt) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1] || dflt;
const sourceEnv = arg('source-env', 'SUPABASE_CONTRACTOR__POSTGRES_URL_NON_POOLING');
const targetEnv = arg('target-env', 'STORAGE_DATABASE_URL_UNPOOLED');

function fail(msg) {
  console.error(`compare-schema: ${scrub(msg)}`);
  process.exit(2);
}

const noExt = (s) => (s == null ? s : s.replace(/\bextensions\./g, ''));
const AUTH_FUNCTIONS = new Set(['toggle_blog_like', 'toggle_blog_save', 'is_contractor_job_member']);

function normalizeSource(cat) {
  for (const t of cat.tables) {
    for (const c of t.columns) { c.type = noExt(c.type); c.default = noExt(c.default); }
    for (const k of t.constraints) {
      k.def = noExt(k.def).replace('REFERENCES auth.users(', 'REFERENCES users(');
      // generate-baseline writes DEFERRABLE INITIALLY IMMEDIATE; Postgres prints it back as DEFERRABLE.
      if (k.type === 'f' && !/DEFERRABLE/.test(k.def)) k.def += ' DEFERRABLE';
    }
  }
  return cat;
}

function index(list, key = 'name') {
  return new Map(list.map((x) => [x[key], x]));
}

function diffTables(src, tgt, out) {
  const s = index(src.tables);
  const t = index(tgt.tables);
  for (const [name, st] of s) {
    const tt = t.get(name);
    if (!tt) { out.push(`table ${name}: missing on target`); continue; }
    const sc = index(st.columns), tc = index(tt.columns);
    for (const [cn, c] of sc) {
      const d = tc.get(cn);
      if (!d) { out.push(`${name}.${cn}: column missing on target`); continue; }
      for (const f of ['type', 'default', 'notnull', 'identity', 'generated']) {
        if ((c[f] ?? null) !== (d[f] ?? null)) out.push(`${name}.${cn}: ${f} ${JSON.stringify(c[f])} vs ${JSON.stringify(d[f])}`);
      }
    }
    for (const cn of tc.keys()) if (!sc.has(cn)) out.push(`${name}.${cn}: extra column on target`);
    if (st.columns.map((c) => c.name).join() !== tt.columns.map((c) => c.name).join()) {
      out.push(`${name}: column order differs`);
    }
    const sk = index(st.constraints), tk = index(tt.constraints);
    for (const [kn, k] of sk) {
      const d = tk.get(kn);
      if (!d) { if (k.type === 'f') out.push(`${name}.${kn}: foreign key not on target (expected only for teller_enrollments/import_batches)`); else out.push(`${name}.${kn}: constraint missing on target`); continue; }
      if (k.def !== d.def) out.push(`${name}.${kn}: ${k.def} vs ${d.def}`);
    }
    for (const kn of tk.keys()) if (!sk.has(kn)) out.push(`${name}.${kn}: extra constraint on target`);
    const si = index(st.indexes), ti = index(tt.indexes);
    for (const [iname, i] of si) {
      const d = ti.get(iname);
      if (!d) out.push(`${name} index ${iname}: missing on target`);
      else if (noExt(i.def) !== d.def) out.push(`${name} index ${iname}: ${i.def} vs ${d.def}`);
    }
    for (const iname of ti.keys()) if (!si.has(iname)) out.push(`${name} index ${iname}: extra on target`);
    const sg = st.triggers.map((x) => x.def).sort().join('\n');
    const tg = tt.triggers.map((x) => x.def).sort().join('\n');
    if (sg !== tg) out.push(`${name}: triggers differ`);
  }
  for (const name of t.keys()) if (!s.has(name)) out.push(`table ${name}: extra on target`);
}

function diffRoutines(src, tgt, out) {
  const tv = index(tgt.views);
  for (const v of src.views) {
    const d = tv.get(v.name);
    if (!d) { out.push(`view ${v.name}: missing on target`); continue; }
    let def = v.def;
    if (v.name === 'expected_payments') {
      def = def.replace('COALESCE(te.st_hours, 0::numeric) * COALESCE(j.pay_rate', 'COALESCE(te.st_hours, te.total_hours, 0::numeric) * COALESCE(j.pay_rate');
    }
    if (def.trim() !== d.def.trim()) out.push(`view ${v.name}: definition differs`);
    if (JSON.stringify(v.options) !== JSON.stringify(d.options)) out.push(`view ${v.name}: options ${JSON.stringify(v.options)} vs ${JSON.stringify(d.options)}`);
  }
  const tf = index(tgt.functions, 'name');
  for (const f of src.functions) {
    const d = tf.get(f.name);
    if (!d) { out.push(`function ${f.name}: missing on target`); continue; }
    if (AUTH_FUNCTIONS.has(f.name)) {
      if (/\bauth\./.test(d.def)) out.push(`function ${f.name}: target still reads auth.*`);
      continue; // rewritten on purpose (user id parameter); see 0002's header
    }
    if (noExt(f.def).trim() !== d.def.trim()) out.push(`function ${f.name}: definition differs`);
  }
}

async function main() {
  const source = process.env[sourceEnv]?.trim();
  const target = process.env[targetEnv]?.trim();
  if (!source) fail(`${sourceEnv} is not set.`);
  if (!target) fail(`${targetEnv} is not set.`);
  if (!isSupabaseUrl(source)) fail(`${sourceEnv} is not a Supabase host.`);
  if (isSupabaseUrl(target)) fail(`${targetEnv} is a Supabase host; the target must be Neon.`);

  const plan = await loadCopyPlan(ROOT);
  const query = catalogQuery({ ...plan, functions: FUNCTIONS });
  const src = normalizeSource(psqlJson(source, query, { readOnly: true }));
  const tgt = psqlJson(target, query, { readOnly: true });

  const out = [];
  diffTables(src, tgt, out);
  diffRoutines(src, tgt, out);

  const counts = (c) => ({
    tables: c.tables.length,
    columns: c.tables.reduce((n, t) => n + t.columns.length, 0),
    constraints: c.tables.reduce((n, t) => n + t.constraints.length, 0),
    indexes: c.tables.reduce((n, t) => n + t.indexes.length, 0),
    triggers: c.tables.reduce((n, t) => n + t.triggers.length, 0),
    views: c.views.length,
    functions: c.functions.length,
  });
  console.log('source (Supabase):', JSON.stringify(counts(src)));
  console.log('target (Neon):    ', JSON.stringify(counts(tgt)));
  const expectedDropped = out.filter((l) => /teller_enrollment_id_fkey|import_batch_id_fkey/.test(l));
  const real = out.filter((l) => !expectedDropped.includes(l));
  for (const l of expectedDropped) console.log(`expected: ${l}`);
  if (real.length) {
    console.log(`\n${real.length} difference(s):`);
    for (const l of real) console.log(`  ${l}`);
    process.exit(1);
  }
  console.log('\nNo differences beyond the deliberate ones (users table, dropped soft references, auth.uid() functions, view fix).');
}

main().catch((e) => fail(e.message));
