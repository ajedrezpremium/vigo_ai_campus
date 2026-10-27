-- VIGO AI CAMPUS: búsqueda semántica con pgvector.
--
-- Requiere que `vector` esté instalado (0001 lo crea). La columna
-- `document_chunks.embedding` ya es `vector(1536)`, que coincide con
-- `openai/text-embedding-3-small` (modelo por defecto).
--
-- Si usas `baai/bge-m3` (1024 dims), cambia la dimensión antes de indexar:
--   alter table public.document_chunks alter column embedding type vector(1024);
-- y ajusta la firma de la función. El script `npm run embed:corpus` valida la
-- dimensión y falla con un mensaje claro si no coincide.

-- Índice HNSW para similitud coseno. Con 131 fragmentos no es imprescindible,
-- pero deja el camino listo para crecer sin cambiar la aplicación.
create index if not exists document_chunks_embedding_idx
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

-- Un documento del corpus se identifica por su id estable en version_label.
-- Así la ingesta es idempotente sin depender del título.
create unique index if not exists documents_org_version_idx
  on public.documents (organization_id, version_label);

-- Búsqueda semántica. Devuelve los metadatos necesarios para construir una
-- cita sin joins adicionales. `security invoker`: respeta RLS; el chat usa la
-- service role en el servidor.
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count integer default 6,
  match_threshold double precision default 0.2,
  filter_organization uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  metadata jsonb,
  organization_id uuid,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    c.metadata,
    c.organization_id,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.embedding is not null
    and (filter_organization is null or c.organization_id = filter_organization)
    and 1 - (c.embedding <=> query_embedding) >= match_threshold
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 50);
$$;

revoke all on function public.match_document_chunks(vector, integer, double precision, uuid) from public;
grant execute on function public.match_document_chunks(vector, integer, double precision, uuid)
  to authenticated, service_role;
