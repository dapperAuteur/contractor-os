// lib/help/sync-request.ts
// Reads the optional JSON body of the help-sync POST routes: { cursor?: number, force?: boolean }.
// A missing or unreadable body means "start from the beginning".

export async function readSyncBody(request: Request): Promise<{ cursor: number; force?: boolean }> {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Empty body: first chunk.
  }
  const b = (body && typeof body === 'object' ? body : {}) as { cursor?: unknown; force?: unknown };
  const cursor = typeof b.cursor === 'number' && Number.isInteger(b.cursor) && b.cursor >= 0 ? b.cursor : 0;
  const force = typeof b.force === 'boolean' ? b.force : undefined;
  return { cursor, force };
}
