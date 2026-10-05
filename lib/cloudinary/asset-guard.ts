// lib/cloudinary/asset-guard.ts
// May the signed-in user store, or have the server destroy, this Cloudinary asset?
//
// WHY THIS EXISTS
// Blog covers, equipment images and equipment media store a Cloudinary
// public_id sent by the browser. Deleting the record then calls Cloudinary's
// destroy endpoint with the server's API secret. Uploads go through a shared
// unsigned preset and a shared folder, so a public_id says nothing about who
// uploaded it: a user could save someone else's public_id on their own record
// and delete the record to destroy the other user's image.
//
// THE RULE
// An asset id is refused when it is malformed, or when any row in a table that
// stores Cloudinary ids (both apps share the database) belongs to someone else.
// A lookup that fails refuses too: the server never destroys an asset it could
// not check. This cannot see assets no table references; those stay out of
// reach only because a caller has no way to learn their ids from this app.
//
// Pure apart from the injected client (tests/asset-guard.test.ts). No '@/' imports.

import type { OwnershipDb } from '../auth/ownership.ts';

/** Every column that stores a Cloudinary public_id, with its owner column (migrations noted). */
export const ASSET_COLUMNS: ReadonlyArray<{ table: string; column: string; owner: string }> = [
  { table: 'blog_posts', column: 'cover_image_public_id', owner: 'user_id' }, // 024
  { table: 'recipes', column: 'cover_image_public_id', owner: 'user_id' }, // 027
  { table: 'equipment', column: 'image_public_id', owner: 'user_id' }, // 069
  { table: 'equipment_media', column: 'public_id', owner: 'user_id' }, // 119
  { table: 'media_notes', column: 'audio_public_id', owner: 'user_id' }, // 140
  { table: 'audio_attachments', column: 'audio_public_id', owner: 'user_id' }, // 142
  { table: 'image_attachments', column: 'image_public_id', owner: 'user_id' }, // 143
  { table: 'media_assets', column: 'cloudinary_public_id', owner: 'owner_id' }, // 180
];

// Cloudinary public ids: folders, letters, digits, - _ . and spaces; no query or
// path tricks. Long enough for real ids, short enough to refuse junk.
const PUBLIC_ID_RE = /^[A-Za-z0-9][A-Za-z0-9 _.\-/]{0,254}$/;

/** True for a string that looks like a Cloudinary public_id. */
export function isPublicId(value: unknown): value is string {
  return typeof value === 'string' && PUBLIC_ID_RE.test(value) && !value.includes('..') && !value.includes('//');
}

export interface AssetCheck {
  /** The caller may use (or have the server destroy) the asset. */
  allowed: boolean;
  /** A lookup failed. */
  failed: boolean;
}

/**
 * May `userId` claim this public_id? false when it is malformed or another
 * user's row references it. Blank ids are "no asset" and allowed.
 */
export async function checkAssetClaim(db: OwnershipDb, userId: string, publicId: unknown): Promise<AssetCheck> {
  if (publicId === null || publicId === undefined || publicId === '') return { allowed: true, failed: false };
  if (!userId || !isPublicId(publicId)) return { allowed: false, failed: false };

  const results = await Promise.all(
    ASSET_COLUMNS.map(async ({ table, column, owner }) => {
      const { data, error } = await db.from(table).select(owner).eq(column, publicId);
      if (error) return { failed: true, foreign: false };
      const rows = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
      return { failed: false, foreign: rows.some((row) => row[owner] !== userId) };
    }),
  );
  if (results.some((r) => r.failed)) return { allowed: false, failed: true };
  return { allowed: !results.some((r) => r.foreign), failed: false };
}

/** May the server destroy this asset for `userId`? Same rule; a failed lookup means no. */
export async function mayDestroyAsset(db: OwnershipDb, userId: string, publicId: unknown): Promise<boolean> {
  if (publicId === null || publicId === undefined || publicId === '') return false;
  const check = await checkAssetClaim(db, userId, publicId);
  return check.allowed && !check.failed;
}

/**
 * Params the upload-signing endpoint must never sign. With any of these a
 * signature authorises destroying, renaming or overwriting an existing asset
 * (image/destroy signs public_id + timestamp), not uploading a new one.
 */
export const UNSIGNABLE_PARAMS: readonly string[] = [
  'public_id',
  'public_ids',
  'from_public_id',
  'to_public_id',
  'overwrite',
  'invalidate',
  'prefix',
  'notification_url',
];

/** The first param a signing request may not include, or null when it is a plain upload. */
export function forbiddenSignParam(params: Record<string, unknown>): string | null {
  for (const key of Object.keys(params)) {
    if (UNSIGNABLE_PARAMS.includes(key)) return key;
  }
  return null;
}
