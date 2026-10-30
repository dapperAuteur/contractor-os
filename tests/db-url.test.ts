// File: tests/db-url.test.ts
// lib/db/url.ts: which database the app and migrations use, and the guard that keeps Drizzle
// migrations off the shared Supabase project (plan 18 §2.2). Run with `npm run test:db`.
// The connection strings below are made up; none of them reaches a network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertMigrationTarget,
  hostKind,
  isNeonPooler,
  isSupabaseUrl,
  poolConfigFor,
  resolveAppDbUrl,
  resolveMigrationUrl,
} from '../lib/db/url.ts';

const SUPA_POOLED = 'postgres://postgres.abcd:secretpw@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x';
const SUPA_DIRECT = 'postgresql://postgres:secretpw@db.abcd.supabase.co:5432/postgres?sslmode=require';
const NEON_DIRECT = 'postgresql://neondb_owner:secretpw@ep-quiet-sky-123456.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const NEON_POOLED = 'postgresql://neondb_owner:secretpw@ep-quiet-sky-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const PEM = '-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----';

test('the app reads WORK_DB_URL first, then STORAGE_DATABASE_URL', () => {
  assert.deepEqual(resolveAppDbUrl({ WORK_DB_URL: SUPA_POOLED, STORAGE_DATABASE_URL: NEON_POOLED }), { url: SUPA_POOLED, source: 'WORK_DB_URL' });
  assert.deepEqual(resolveAppDbUrl({ STORAGE_DATABASE_URL: NEON_POOLED }), { url: NEON_POOLED, source: 'STORAGE_DATABASE_URL' });
  assert.deepEqual(resolveAppDbUrl({ WORK_DB_URL: '  ', STORAGE_DATABASE_URL: NEON_POOLED })?.source, 'STORAGE_DATABASE_URL');
  assert.equal(resolveAppDbUrl({}), null);
});

test('migrations read STORAGE_DATABASE_URL_UNPOOLED, then NEON_DIRECT_URL, and never WORK_DB_URL', () => {
  assert.equal(resolveMigrationUrl({ STORAGE_DATABASE_URL_UNPOOLED: NEON_DIRECT, NEON_DIRECT_URL: 'x' })?.source, 'STORAGE_DATABASE_URL_UNPOOLED');
  assert.equal(resolveMigrationUrl({ NEON_DIRECT_URL: NEON_DIRECT })?.source, 'NEON_DIRECT_URL');
  assert.equal(resolveMigrationUrl({ WORK_DB_URL: NEON_DIRECT, STORAGE_DATABASE_URL: NEON_POOLED }), null);
});

test('Supabase hosts are recognized: direct, pooler, any case, and a host= override', () => {
  assert.equal(isSupabaseUrl(SUPA_POOLED), true);
  assert.equal(isSupabaseUrl(SUPA_DIRECT), true);
  assert.equal(isSupabaseUrl(SUPA_DIRECT.replace('supabase.co', 'SUPABASE.CO')), true);
  assert.equal(isSupabaseUrl(`${NEON_DIRECT}&host=db.abcd.supabase.co`), true);
  assert.equal(isSupabaseUrl(NEON_DIRECT), false);
  assert.equal(isSupabaseUrl('postgres://u:p@notsupabase.com/db'), false);
  assert.equal(hostKind(NEON_DIRECT), 'neon');
  assert.equal(hostKind('postgres://u:p@localhost:5432/db'), 'local');
});

test('the migration guard refuses Supabase and names the env var, never the value', () => {
  assert.throws(
    () => assertMigrationTarget({ url: SUPA_POOLED, source: 'NEON_DIRECT_URL' }),
    (err: Error) => /Refusing to migrate: NEON_DIRECT_URL points at a Supabase host/.test(err.message) && !err.message.includes('secretpw') && !err.message.includes('pooler.supabase.com'),
  );
  assert.doesNotThrow(() => assertMigrationTarget({ url: NEON_DIRECT, source: 'NEON_DIRECT_URL' }));
});

test('invalid strings fail without echoing the value', () => {
  assert.throws(() => isSupabaseUrl('not a url secretpw'), (err: Error) => !err.message.includes('secretpw'));
  assert.throws(() => isSupabaseUrl('mysql://u:secretpw@h/db'), /postgres:\/\//);
});

test('the Neon -pooler endpoint is detected', () => {
  assert.equal(isNeonPooler(NEON_POOLED), true);
  assert.equal(isNeonPooler(NEON_DIRECT), false);
  assert.equal(isNeonPooler(SUPA_POOLED), false);
});

test('Neon strings pass through unchanged', () => {
  assert.deepEqual(poolConfigFor(NEON_DIRECT, {}), { connectionString: NEON_DIRECT });
});

test('Supabase needs its root CA: without it, poolConfigFor throws instead of skipping verification', () => {
  assert.throws(() => poolConfigFor(SUPA_POOLED, {}), /WORK_DB_CA_CERT/);
  assert.throws(() => poolConfigFor(SUPA_POOLED, { WORK_DB_CA_CERT: 'not a pem' }), /WORK_DB_CA_CERT/);
});

test('with the CA, Supabase gets verified TLS and the sslmode/supa parameters are removed', () => {
  const cfg = poolConfigFor(SUPA_POOLED, { WORK_DB_CA_CERT: PEM.replace(/\n/g, '\\n') });
  assert.equal(cfg.ssl?.rejectUnauthorized, true);
  assert.equal(cfg.ssl?.ca, PEM);
  const u = new URL(cfg.connectionString);
  assert.equal(u.searchParams.has('sslmode'), false);
  assert.equal(u.searchParams.has('supa'), false);
  assert.equal(u.hostname, 'aws-0-us-east-1.pooler.supabase.com');
  assert.equal(u.port, '6543');
});
