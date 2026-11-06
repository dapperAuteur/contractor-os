// File: lib/union/chunks.ts
// Chunking and embedding for union documents, shared by the three writers: upload
// (/api/contractor/union/documents), private replace (/api/contractor/union/documents/[id]/replace)
// and admin approval (/api/admin/union-submissions/[id]). Before this file each route carried its own
// copy of chunkText and a one-text-per-request Gemini call, five at a time.
//
// Rows are written with `embedding_v2` (vector(1024), mistral-embed, migration 226) only. The legacy
// 768-dimension `embedding` column stays NULL on new rows; nothing in Work.WitUS reads it any more.

import { toPgVector } from '../ai/mistral-embed.ts';

export const CHUNK_SIZE = 1500; // characters per chunk
export const CHUNK_OVERLAP = 200;
export const UNION_EMBEDDING_COLUMN = 'embedding_v2';

export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start = end - CHUNK_OVERLAP;
    if (start >= text.length || end === text.length) break;
  }
  return chunks;
}

export interface UnionChunkRow {
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  embedding_v2: string;
}

/**
 * Embed every chunk (one batched, paced call: `embed` is normally lib/ai/mistral-embed.ts
 * embedTexts) and return the rows to insert into union_document_chunks.
 */
export async function buildChunkRows(
  documentId: string,
  chunks: string[],
  embed: (texts: string[]) => Promise<number[][]>,
): Promise<UnionChunkRow[]> {
  if (chunks.length === 0) return [];
  const vectors = await embed(chunks);
  if (vectors.length !== chunks.length) {
    throw new Error(`Embedded ${vectors.length} of ${chunks.length} chunks.`);
  }
  return chunks.map((chunk_text, chunk_index) => ({
    document_id: documentId,
    chunk_text,
    chunk_index,
    [UNION_EMBEDDING_COLUMN]: toPgVector(vectors[chunk_index]),
  }) as UnionChunkRow);
}
