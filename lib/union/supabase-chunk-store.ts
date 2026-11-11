// File: lib/union/supabase-chunk-store.ts
// The UnionChunkStore (lib/union/embed-backfill.ts) on Supabase `union_document_chunks`. Takes the
// client as an argument and imports nothing from `@/`, so tests can hand it a fake. Writes only
// `embedding_v2`; never reads a vector back (the select names text columns only).

import { toPgVector } from '../ai/mistral-embed.ts';
import { UNION_EMBEDDING_COLUMN } from './chunks.ts';
import type { PendingChunk, UnionChunkStore } from './embed-backfill.ts';

export interface UnionDb {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
}

type PendingRow = {
  id: string;
  chunk_text: string;
  chunk_index: number;
  union_documents: { name: string | null } | { name: string | null }[] | null;
};

export function createUnionChunkStore(db: UnionDb): UnionChunkStore {
  const count = async (pendingOnly: boolean) => {
    let q = db.from('union_document_chunks').select('id', { count: 'exact', head: true });
    if (pendingOnly) q = q.is(UNION_EMBEDDING_COLUMN, null);
    const { count: n, error } = await q;
    if (error) throw new Error(`union_document_chunks count failed: ${error.message}`);
    return (n as number | null) ?? 0;
  };
  return {
    countAll: () => count(false),
    countPending: () => count(true),
    async listPending(limit, afterId) {
      let q = db
        .from('union_document_chunks')
        .select('id, chunk_text, chunk_index, union_documents(name)')
        .is(UNION_EMBEDDING_COLUMN, null)
        .order('id', { ascending: true })
        .limit(limit);
      if (afterId) q = q.gt('id', afterId);
      const { data, error } = await q;
      if (error) throw new Error(`union_document_chunks read failed: ${error.message}`);
      return ((data ?? []) as PendingRow[]).map((r): PendingChunk => {
        const doc = Array.isArray(r.union_documents) ? r.union_documents[0] : r.union_documents;
        return {
          id: r.id,
          text: r.chunk_text,
          label: `${doc?.name ?? 'Union document'}, section ${r.chunk_index + 1}`,
        };
      });
    },
    async saveV2(id, vector) {
      const { error } = await db
        .from('union_document_chunks')
        .update({ [UNION_EMBEDDING_COLUMN]: toPgVector(vector) })
        .eq('id', id);
      if (error) throw new Error(`union_document_chunks write failed: ${error.message}`);
    },
  };
}
