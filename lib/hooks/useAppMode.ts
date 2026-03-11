// lib/hooks/useAppMode.ts
// Always returns 'contractor' — subdomain detection removed.

'use client';

export type AppMode = 'main' | 'contractor' | 'lister';

export function useAppMode(): AppMode {
  return 'contractor';
}
