// lib/profiles/public-profiles.ts
// Where public pages read OTHER users' profile fields from.
//
// The `profiles` table is shared with CentenarianOS. After its migration 207 the table is readable
// only by the row's owner (and the service role). Author names, avatars and bios for blog pages
// come from the `public_profiles` view (CentenarianOS migration 206), which carries only the
// columns below. Reading your own profile (settings, subscription, onboarding) still uses
// `profiles`. Keep this file in sync with centenarian-os/lib/profiles/public-profiles.ts.

/** View with the public columns of every profile. Safe to read with the anon key. */
export const PUBLIC_PROFILES_VIEW = 'public_profiles';

/** Columns the public_profiles view exposes (must match CentenarianOS migration 206). */
export const PUBLIC_PROFILE_COLUMNS = [
  'id',
  'username',
  'display_name',
  'bio',
  'avatar_url',
  'created_at',
  'updated_at',
] as const;

export type PublicProfileColumn = (typeof PUBLIC_PROFILE_COLUMNS)[number];
