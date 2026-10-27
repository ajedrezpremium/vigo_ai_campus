import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { embedQuery, getEmbeddingsConfig, toVectorLiteral } from "@/lib/embeddings";
import { cosineSimilarity, parseVector, type SemanticHit, type SemanticMetadata } from "@/lib/hybrid";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export type SemanticSearchOptions = {
  topK?: number;
  threshold?: number;
  organizationId?: string | null;
};

export type SemanticBackend = "rpc" | "cache" | "none";

type CachedChunk = {
  hit: Omit<SemanticHit, "similarity">;
  organizationId: string | null;
  vector: Float32Array;
};

const CACHE_TTL_MS = 5 * 60_000;
const MAX_CACHED_CHUNKS = 5_000;

let cachedChunks: { at: number; items: CachedChunk[] } | null = null;
let rpcUnavailableUntil = 0;
let rpcWarned = false;

export function isSemanticSearchConfigured(): boolean {
  const config = getEmbeddingsConfig();
  return config.enabled && Boolean(config.apiKey);
}

function asMetadata(value: unknown): SemanticMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as SemanticMetadata;
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowToHit(row: Record<string, unknown>): SemanticHit | null {
  const rawId = typeof row.id === "string" ? row.id : "";
  const documentId = typeof row.document_id === "string" ? row.document_id : "";
  if (!rawId || !documentId) return null;

  const content = typeof row.content === "string" ? row.content : "";
  const metadata = asMetadata(row.metadata);
  const chunkIndex = asNumber(row.chunk_index);
  // El id estable del corpus (`uvigo-matricula-0`) permite fusionar con BM25,
  // que usa exactamente la misma clave. Si falta, se usa el uuid de Postgres.
  const corpusId = typeof metadata.corpusId === "string" ? metadata.corpusId : null;
  const id = corpusId ? `${corpusId}-${chunkIndex}` : rawId;

  return {
    id,
    documentId: corpusId ?? documentId,
    chunkIndex,
    content,
    similarity: asNumber(row.similarity),
    metadata,
  };
}

async function searchWithRpc(
  admin: AdminClient,
  vector: number[],
  options: Required<Pick<SemanticSearchOptions, "topK" | "threshold">> & { organizationId: string | null },
): Promise<SemanticHit[]> {
  const { data, error } = await admin.rpc("match_document_chunks", {
    query_embedding: toVectorLiteral(vector),
    match_count: Math.min(Math.max(options.topK, 1), 50),
    match_threshold: options.threshold,
    filter_organization: options.organizationId,
  });

  if (error) throw Object.assign(new Error(error.message), { code: error.code });

  if (!Array.isArray(data)) return [];
  return (data as unknown as Record<string, unknown>[])
    .map(rowToHit)
    .filter((hit): hit is SemanticHit => Boolean(hit));
}

async function loadCachedChunks(admin: AdminClient): Promise<CachedChunk[] | null> {
  if (cachedChunks && Date.now() - cachedChunks.at < CACHE_TTL_MS) return cachedChunks.items;

  const { data, error } = await admin
    .from("document_chunks")
    .select("id, document_id, chunk_index, content, metadata, organization_id, embedding")
    .not("embedding", "is", null)
    .limit(MAX_CACHED_CHUNKS + 1);

  if (error || !data) return null;
  if (data.length > MAX_CACHED_CHUNKS) return null;

  const items: CachedChunk[] = [];
  for (const row of data) {
    const parsed = parseVector((row as { embedding?: unknown }).embedding);
    if (!parsed?.length) continue;
    const hit = rowToHit({ ...row, similarity: 0 });
    if (!hit) continue;
    items.push({
      hit: {
        id: hit.id,
        documentId: hit.documentId,
        chunkIndex: hit.chunkIndex,
        content: hit.content,
        metadata: hit.metadata,
      },
      organizationId: typeof row.organization_id === "string" ? row.organization_id : null,
      vector: Float32Array.from(parsed),
    });
  }

  cachedChunks = { at: Date.now(), items };
  return items;
}

async function searchWithCache(
  admin: AdminClient,
  vector: number[],
  options: Required<Pick<SemanticSearchOptions, "topK" | "threshold">> & { organizationId: string | null },
): Promise<SemanticHit[]> {
  const items = await loadCachedChunks(admin);
  if (!items) return [];

  const scored: SemanticHit[] = [];
  for (const item of items) {
    if (options.organizationId && item.organizationId !== options.organizationId) continue;
    const similarity = cosineSimilarity(vector, item.vector);
    if (similarity < options.threshold) continue;
    scored.push({ ...item.hit, similarity });
  }

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.min(Math.max(options.topK, 1), 50));
}

/**
 * Búsqueda semántica sobre `document_chunks`.
 *
 * 1. Intenta la función SQL `match_document_chunks` (pgvector + HNSW).
 * 2. Si la migración aún no está aplicada, carga los embeddings en memoria y
 *    calcula el coseno en el proceso. Es suficiente para el corpus actual y
 *    permite verificar la calidad sin bloquear el despliegue.
 * 3. Si no hay Supabase o embeddings, devuelve `[]` y el llamador usa BM25.
 */
export async function searchSemantic(
  query: string,
  options: SemanticSearchOptions = {},
): Promise<SemanticHit[]> {
  const config = getEmbeddingsConfig();
  if (!config.enabled || !config.apiKey) return [];

  const admin = getSupabaseAdminClient();
  if (!admin) return [];

  const vector = await embedQuery(query);
  const normalized = {
    topK: options.topK ?? 6,
    threshold: options.threshold ?? 0.2,
    organizationId: options.organizationId ?? null,
  };

  if (Date.now() > rpcUnavailableUntil) {
    try {
      return await searchWithRpc(admin, vector, normalized);
    } catch (error) {
      const code = (error as { code?: string }).code;
      // PGRST202: la función no existe todavía. Cualquier otro fallo también
      // degrada a la caché para no romper el chat.
      rpcUnavailableUntil = Date.now() + 10 * 60_000;
      if (!rpcWarned) {
        rpcWarned = true;
        const detail = error instanceof Error ? error.message : "error desconocido";
        console.warn(
          `[semantic] match_document_chunks no disponible (${code ?? "sin código"}): ${detail}. ` +
            "Se usa búsqueda en memoria; aplica supabase/migrations/0003_semantic_search.sql.",
        );
      }
    }
  }

  try {
    return await searchWithCache(admin, vector, normalized);
  } catch (error) {
    console.warn("[semantic] no se pudo leer document_chunks:", error instanceof Error ? error.message : error);
    return [];
  }
}

export type SemanticBackendStatus = {
  configured: boolean;
  model: string;
  dimensions: number;
  backend: SemanticBackend;
  chunks: number | null;
  rpcError: string | null;
};

/** Diagnóstico para `npm run semantic:status` y el panel de administración. */
export async function getSemanticBackendStatus(): Promise<SemanticBackendStatus> {
  const config = getEmbeddingsConfig();
  const admin = getSupabaseAdminClient();
  const base: SemanticBackendStatus = {
    configured: config.enabled && Boolean(config.apiKey) && Boolean(admin),
    model: config.model,
    dimensions: config.dimensions,
    backend: "none",
    chunks: null,
    rpcError: null,
  };
  if (!admin) return base;

  const count = await admin
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .not("embedding", "is", null);
  if (typeof count.count === "number") base.chunks = count.count;

  const probe = new Float32Array(config.dimensions);
  probe[0] = 1;
  const { error } = await admin.rpc("match_document_chunks", {
    query_embedding: toVectorLiteral(probe),
    match_count: 1,
    match_threshold: 0.99,
    filter_organization: null,
  });

  if (!error) {
    base.backend = "rpc";
    return base;
  }

  base.rpcError = error.message;
  base.backend = "cache";
  return base;
}

export function resetSemanticCache() {
  cachedChunks = null;
  rpcUnavailableUntil = 0;
  rpcWarned = false;
}
