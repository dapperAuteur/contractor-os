ALTER TABLE "help_articles" ADD COLUMN "embedding_v2" vector(1024);--> statement-breakpoint
ALTER TABLE "union_document_chunks" ADD COLUMN "embedding_v2" vector(1024);--> statement-breakpoint
CREATE INDEX "idx_help_articles_embedding_v2" ON "help_articles" USING hnsw ("embedding_v2" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_union_chunks_embedding_v2" ON "union_document_chunks" USING hnsw ("embedding_v2" vector_cosine_ops);--> statement-breakpoint
-- Hand-written below this line (drizzle-kit does not emit functions): the v2 match functions, the
-- same bodies as supabase/migrations/226_mistral_embeddings_v2.sql so the two databases agree for
-- scripts/db/compare-schema.mjs. No REVOKE/GRANT here: Neon has no anon/authenticated roles.
CREATE OR REPLACE FUNCTION public.match_help_articles_v2(query_embedding vector(1024), match_count integer DEFAULT 5, role_filter text DEFAULT NULL::text, app_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, title text, content text, role text, similarity double precision)
 LANGUAGE sql
 STABLE
 SET search_path = public, extensions
AS $function$
  SELECT
    h.id,
    h.title,
    h.content,
    h.role,
    1 - (h.embedding_v2 <=> query_embedding) AS similarity
  FROM public.help_articles h
  WHERE
    h.embedding_v2 IS NOT NULL
    AND (role_filter IS NULL OR h.role IN (role_filter, 'all'))
    AND (app_filter IS NULL OR h.app = app_filter)
  ORDER BY h.embedding_v2 <=> query_embedding
  LIMIT match_count;
$function$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.match_union_chunks_v2(query_embedding vector(1024), match_count integer DEFAULT 5, union_filter text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, document_id uuid, chunk_text text, chunk_index integer, doc_name text, union_local text, similarity double precision)
 LANGUAGE sql
 STABLE
 SET search_path = public, extensions
AS $function$
  SELECT
    c.id,
    c.document_id,
    c.chunk_text,
    c.chunk_index,
    d.name AS doc_name,
    d.union_local,
    1 - (c.embedding_v2 <=> query_embedding) AS similarity
  FROM public.union_document_chunks c
  JOIN public.union_documents d ON d.id = c.document_id
  WHERE d.status = 'ready'
    AND c.embedding_v2 IS NOT NULL
    AND (d.user_id = p_user_id OR d.is_shared = true)
    AND (union_filter IS NULL OR d.union_local = union_filter)
  ORDER BY c.embedding_v2 <=> query_embedding
  LIMIT match_count;
$function$;
