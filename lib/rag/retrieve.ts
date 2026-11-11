// File: lib/rag/retrieve.ts
// The two vector searches Work.WitUS runs, on the v2 (mistral-embed, 1024-dimension) columns:
//   match_help_articles_v2  for the help chat   (/api/help/chat)
//   match_union_chunks_v2   for the union chat  (/api/contractor/union/chat)
// Both functions are created by supabase/migrations/226_mistral_embeddings_v2.sql. The legacy
// match_help_articles / match_union_chunks (768, Gemini) stay for CentenarianOS and for the code
// deployed before the move, until a cleanup migration drops them.
//
// GRACEFUL DEGRADE. Until the rows are re-embedded the v2 functions return no rows, and before the
// SQL is applied the RPC errors (PostgREST "function not found"). Either way these helpers return an
// empty list plus a `degraded` reason instead of throwing, so the chats answer "nothing found" rather
// than a 500. The reason is for the server log only; it never carries a key or a vector.
//
// Pure: the caller passes the Supabase client's `rpc`, so tests can hand in a fake.

import { EMBED_DIMS, toPgVector } from '../ai/mistral-embed.ts';

export const HELP_MATCH_FN = 'match_help_articles_v2';
export const UNION_MATCH_FN = 'match_union_chunks_v2';

export type Rpc = (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;

export interface HelpMatch {
  id: string;
  title: string;
  content: string;
  role: string;
  similarity: number;
}

export interface UnionMatch {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  doc_name: string;
  union_local: string | null;
  similarity: number;
}

export interface Retrieved<T> {
  matches: T[];
  /** Why the search came back empty for a reason other than "no close rows". */
  degraded?: string;
}

async function callMatch<T>(rpc: Rpc, fn: string, vector: number[], args: Record<string, unknown>): Promise<Retrieved<T>> {
  if (vector.length !== EMBED_DIMS) {
    return { matches: [], degraded: `query vector has ${vector.length} dimensions, expected ${EMBED_DIMS}` };
  }
  try {
    const { data, error } = await rpc(fn, { query_embedding: toPgVector(vector), ...args });
    if (error) return { matches: [], degraded: `${fn} failed: ${error.code ? `${error.code} ` : ''}${error.message}` };
    return { matches: Array.isArray(data) ? (data as T[]) : [] };
  } catch (e) {
    return { matches: [], degraded: `${fn} threw: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export function matchHelpArticles(
  rpc: Rpc,
  vector: number[],
  opts: { app: string; role?: string | null; count?: number },
): Promise<Retrieved<HelpMatch>> {
  return callMatch<HelpMatch>(rpc, HELP_MATCH_FN, vector, {
    match_count: opts.count ?? 5,
    role_filter: opts.role ?? null,
    app_filter: opts.app,
  });
}

export function matchUnionChunks(
  rpc: Rpc,
  vector: number[],
  opts: { userId: string; unionLocal?: string | null; count?: number },
): Promise<Retrieved<UnionMatch>> {
  return callMatch<UnionMatch>(rpc, UNION_MATCH_FN, vector, {
    match_count: opts.count ?? 5,
    union_filter: opts.unionLocal || null,
    p_user_id: opts.userId,
  });
}
