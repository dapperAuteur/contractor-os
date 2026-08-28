#!/usr/bin/env node
// scripts/resync-income-events.mjs
// Pushes the CURRENT contents of the expected_payments view to CentOS's income projection.
//
// Why this exists alongside the per-invoice emitter: the emitter is fire-and-forget, so a
// CentOS outage or a network blip silently drops an event. This script is the reconciler that
// makes the projection eventually consistent regardless. Run it on a schedule during Phase 2,
// and after any incident.
//
// Idempotent: event_id is `${source_type}:${source_id}`, the same scheme the emitter and
// CentOS's backfill use, so re-running updates rather than duplicates.
//
// Usage:
//   node --env-file=.env.local scripts/resync-income-events.mjs --dry
//   node --env-file=.env.local scripts/resync-income-events.mjs

import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL = process.env.INCOME_EVENTS_URL;
const SECRET = process.env.INCOME_EVENTS_SECRET;
const SLUG = process.env.INCOME_EVENTS_SOURCE_SLUG ?? 'work_witus';
const DRY = process.argv.includes('--dry');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE env vars. Run with: node --env-file=.env.local scripts/resync-income-events.mjs');
  process.exit(1);
}
if (!DRY && (!URL || !SECRET)) {
  console.error('Missing INCOME_EVENTS_URL / INCOME_EVENTS_SECRET. Use --dry to preview without them.');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const { data: rows, error } = await db.from('expected_payments').select('*').order('expected_date');
if (error) {
  console.error(`Could not read expected_payments: ${error.message}`);
  process.exit(1);
}
if (!rows?.length) {
  console.log('expected_payments is empty. Nothing to resync.');
  process.exit(0);
}

const skipped = [];
const events = [];
for (const r of rows) {
  if (!r.source_id || !r.source_type || !r.user_id || !r.expected_date) {
    skipped.push(`${r.label ?? 'unlabelled'} on ${r.expected_date ?? '?'}: missing required field`);
    continue;
  }
  events.push({
    event_id: `${r.source_type}:${r.source_id}`,
    user_id: r.user_id,
    source_type: r.source_type,
    source_id: r.source_id,
    expected_date: r.expected_date,
    label: r.label ?? null,
    reference_number: r.reference_number ?? null,
    expected_amount: Number(r.expected_amount ?? 0),
    status: r.status ?? null,
    start_date: r.start_date ?? null,
    end_date: r.end_date ?? null,
    brand_id: r.brand_id ?? null,
    is_active: true,
  });
}

console.log(`Read ${rows.length} rows; prepared ${events.length} events.`);
if (skipped.length) {
  console.log(`Skipped ${skipped.length}:`);
  for (const s of skipped.slice(0, 10)) console.log(`  - ${s}`);
}
if (DRY) {
  console.log('\n[dry] Nothing sent. Re-run without --dry to push.');
  process.exit(0);
}

// CentOS caps a request at 500 events.
const BATCH = 500;
let accepted = 0;
for (let i = 0; i < events.length; i += BATCH) {
  const body = JSON.stringify({ events: events.slice(i, i + BATCH) });
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex');

  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Witus-Source': SLUG,
      'X-Witus-Timestamp': ts,
      'X-Witus-Signature': `sha256=${sig}`,
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`\nBatch at ${i} failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
    console.error(`${accepted} events accepted before this point. Re-running is safe.`);
    process.exit(1);
  }
  let parsed = {};
  try { parsed = JSON.parse(text); } catch { /* ignore */ }
  accepted += parsed.accepted ?? 0;
  if (parsed.rejected) {
    console.warn(`\nBatch at ${i}: ${parsed.rejected} rejected. ${JSON.stringify(parsed.details ?? [])}`);
  }
  process.stdout.write(`\rPushed ${Math.min(i + BATCH, events.length)}/${events.length}, accepted ${accepted}...`);
}
console.log(`\nDone. CentOS accepted ${accepted} events.`);
