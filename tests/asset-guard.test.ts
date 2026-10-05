// tests/asset-guard.test.ts
// Run: npm run test:auth
//
// Cloudinary public ids from the browser (lib/cloudinary/asset-guard.ts): a
// user may not claim, or have the server destroy, an asset another user's
// record holds; the signing endpoint never signs destroy-style params.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { OwnershipDb } from '../lib/auth/ownership.ts';
import {
  ASSET_COLUMNS,
  checkAssetClaim,
  forbiddenSignParam,
  isPublicId,
  mayDestroyAsset,
} from '../lib/cloudinary/asset-guard.ts';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

type Row = Record<string, unknown>;

function fakeDb(store: Record<string, Row[]>, fail: string[] = []): OwnershipDb {
  return {
    from(table: string) {
      return {
        select() {
          return {
            eq(column: string, value: unknown) {
              if (fail.includes(table)) return Promise.resolve({ data: null, error: { message: 'boom' } });
              return Promise.resolve({ data: (store[table] ?? []).filter((row) => row[column] === value), error: null });
            },
          };
        },
      };
    },
  };
}

const STORE: Record<string, Row[]> = {
  blog_posts: [{ cover_image_public_id: 'blog/mine', user_id: ME }],
  equipment: [{ image_public_id: 'blog/theirs', user_id: OTHER }],
  media_assets: [{ cloudinary_public_id: 'assets/theirs', owner_id: OTHER }],
};

test('isPublicId accepts Cloudinary-style ids and refuses tricks', () => {
  assert.ok(isPublicId('blog/abc_123-x.y'));
  assert.ok(isPublicId('folder/My Photo'));
  for (const bad of ['', '/abs', 'a/../b', 'a//b', 'a?b=1', 'a&public_id=x', 42, null, 'x'.repeat(300)]) {
    assert.equal(isPublicId(bad), false, String(bad));
  }
});

test('checkAssetClaim: own or unreferenced is allowed, another user\'s is refused', async () => {
  const db = fakeDb(STORE);
  assert.deepEqual(await checkAssetClaim(db, ME, 'blog/mine'), { allowed: true, failed: false });
  assert.deepEqual(await checkAssetClaim(db, ME, 'blog/new-upload'), { allowed: true, failed: false });
  assert.deepEqual(await checkAssetClaim(db, ME, 'blog/theirs'), { allowed: false, failed: false });
  assert.deepEqual(await checkAssetClaim(db, ME, 'assets/theirs'), { allowed: false, failed: false }, 'owner_id column');
});

test('checkAssetClaim: blank is no asset; malformed or no caller is refused', async () => {
  const db = fakeDb(STORE);
  assert.equal((await checkAssetClaim(db, ME, '')).allowed, true);
  assert.equal((await checkAssetClaim(db, ME, null)).allowed, true);
  assert.equal((await checkAssetClaim(db, ME, 'a/../b')).allowed, false);
  assert.equal((await checkAssetClaim(db, '', 'blog/mine')).allowed, false);
});

test('a failed lookup refuses, and mayDestroyAsset never destroys on failure', async () => {
  const db = fakeDb(STORE, ['recipes']);
  assert.deepEqual(await checkAssetClaim(db, ME, 'blog/mine'), { allowed: false, failed: true });
  assert.equal(await mayDestroyAsset(db, ME, 'blog/mine'), false);
});

test('mayDestroyAsset: own yes, theirs no, blank no', async () => {
  const db = fakeDb(STORE);
  assert.equal(await mayDestroyAsset(db, ME, 'blog/mine'), true);
  assert.equal(await mayDestroyAsset(db, ME, 'blog/theirs'), false);
  assert.equal(await mayDestroyAsset(db, ME, ''), false);
});

test('every asset column names a table and owner', () => {
  for (const c of ASSET_COLUMNS) assert.ok(c.table && c.column && c.owner);
  assert.ok(ASSET_COLUMNS.some((c) => c.table === 'equipment_media' && c.column === 'public_id'));
});

test('forbiddenSignParam refuses destroy/rename/overwrite params, allows a plain upload', () => {
  assert.equal(forbiddenSignParam({ folder: 'blog', timestamp: 1, source: 'uw' }), null);
  assert.equal(forbiddenSignParam({ public_id: 'blog/x', timestamp: 1 }), 'public_id');
  assert.equal(forbiddenSignParam({ folder: 'blog', overwrite: 'true', timestamp: 1 }), 'overwrite');
  assert.equal(forbiddenSignParam({ from_public_id: 'a', to_public_id: 'b', timestamp: 1 }), 'from_public_id');
});
