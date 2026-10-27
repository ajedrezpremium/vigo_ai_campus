import type { RetrievedChunk } from "@/lib/retrieval";

/** Metadatos que viajan con cada fragmento indexado en `document_chunks`. */
export type SemanticMetadata = {
  corpusId?: string;
  title?: string;
  sourceUrl?: string;
  locale?: "es" | "gl" | "en";
  organization?: string;
  kind?: "html" | "pdf" | "demo";
  reviewedAt?: string;
  truncated?: boolean;
  sourceType?: "official" | "demo";
  documentIntro?: string;
  status?: string;
};

export type SemanticHit = {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  metadata: SemanticMetadata;
};

/**
 * Similitud coseno en JS. Se usa cuando la base de datos todavía no tiene la
 * función `match_document_chunks` (o cuando el corpus es pequeño y ya está en
 * memoria). Con pgvector el cálculo se hace en Postgres.
 */
export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** PostgREST devuelve `vector` como texto `[0.1,0.2]`; también acepta arrays. */
export function parseVector(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    const vector = value.map(Number);
    return vector.every(Number.isFinite) ? vector : null;
  }
  if (typeof value !== "string") return null;

  const trimmed = value.trim().replace(/^\{/, "[").replace(/\}$/, "]");
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  const body = trimmed.slice(1, -1).trim();
  if (!body) return [];
  const vector = body.split(",").map((part) => Number(part.trim()));
  return vector.every(Number.isFinite) ? vector : null;
}

function asLocale(value: unknown): "es" | "gl" | "en" {
  return value === "gl" || value === "en" ? value : "es";
}

function asKind(value: unknown): "html" | "pdf" | "demo" {
  return value === "pdf" || value === "demo" ? value : "html";
}

export function semanticHitToChunk(hit: SemanticHit): RetrievedChunk {
  const kind = asKind(hit.metadata.kind);
  return {
    id: hit.id,
    documentId: hit.documentId,
    title: hit.metadata.title ?? "Documento sin título",
    sourceUrl: hit.metadata.sourceUrl ?? "",
    snippet: hit.content,
    // El umbral de derivación humana usa `score < 1.2`; se mantiene una escala
    // comparable a BM25 para no cambiar el comportamiento existente.
    score: Math.max(0, hit.similarity) * 6,
    confidence: Math.min(1, Math.max(0, hit.similarity)),
    sourceType: hit.metadata.sourceType ?? (kind === "demo" ? "demo" : "official"),
    organization: hit.metadata.organization ?? "Universidade de Vigo",
    locale: asLocale(hit.metadata.locale),
    kind,
    reviewedAt: hit.metadata.reviewedAt ?? "",
    truncated: hit.metadata.truncated ?? false,
    chunkIndex: hit.chunkIndex,
    documentIntro: hit.metadata.documentIntro ?? hit.content.slice(0, 1600),
    semantic: Math.min(1, Math.max(0, hit.similarity)),
  };
}

const RRF_K = 60;
const SEMANTIC_WEIGHT = 1.15;
/**
 * Con un ancla léxica fuerte el semántico entra en el top-k pero nunca desplaza
 * a los tres primeros resultados de BM25. Así una pregunta como «grados» sigue
 * devolviendo `uvigo-grados` aunque el embedding se parezca más a `uvigo-becas`.
 */
const STRONG_LEXICAL_WEIGHT = 0.95;

/**
 * Fusión por rangos recíprocos (RRF): combina el ranking léxico y el semántico
 * sin necesidad de calibrar sus escalas. Un fragmento que aparece en ambos
 * rankings sube; uno que solo aparece en uno conserva su posición.
 */
export function fuseRetrieval(
  lexical: RetrievedChunk[],
  semantic: SemanticHit[],
  topK = 4,
): RetrievedChunk[] {
  type Entry = {
    chunk: RetrievedChunk;
    rrf: number;
    score: number;
    order: number;
  };

  const entries = new Map<string, Entry>();
  let order = 0;

  // Si BM25 ya tiene un ancla fuerte (cobertura alta), el tramo semántico solo
  // complementa. Si BM25 va perdido (paráfrasis, otro idioma), el semántico
  // puede liderar el ranking sin arrastrar resultados incorrectos.
  const lexicalConfidence = lexical[0]?.confidence ?? 0;
  const semanticWeight = lexicalConfidence < 0.5 ? SEMANTIC_WEIGHT : STRONG_LEXICAL_WEIGHT;
  // Plazas reservadas para el tramo semántico: 0-3 según la confianza léxica.
  const semanticReserve =
    lexicalConfidence < 0.5 ? Math.min(3, topK) : lexicalConfidence < 0.75 ? 2 : 1;

  lexical.forEach((chunk, rank) => {
    entries.set(chunk.id, {
      chunk,
      rrf: 1 / (RRF_K + rank + 1),
      score: chunk.score,
      order: order++,
    });
  });

  semantic.forEach((hit, rank) => {
    const chunk = semanticHitToChunk(hit);
    // Las fuentes demo siguen siendo útiles, pero ceden ante una oficial.
    const weight = chunk.sourceType === "demo" ? semanticWeight * 0.55 : semanticWeight;
    const rrf = weight / (RRF_K + rank + 1);
    const existing = entries.get(chunk.id);
    if (existing) {
      existing.rrf += rrf;
      existing.score = Math.max(existing.score, chunk.score);
      existing.order = Math.min(existing.order, order);
      // La confianza combina cobertura léxica y similitud semántica.
      existing.chunk = {
        ...existing.chunk,
        confidence: Math.max(existing.chunk.confidence, chunk.confidence),
        semantic: Math.max(existing.chunk.semantic ?? 0, hit.similarity),
      };
    } else {
      entries.set(chunk.id, { chunk, rrf, score: chunk.score, order: order++ });
    }
  });

  const ranked = [...entries.values()].sort(
    (a, b) => b.rrf - a.rrf || b.score - a.score || a.order - b.order,
  );

  // Se garantiza el top-3 léxico y las plazas semánticas reservadas. Con eso
  // una paráfrasis rescatada por embeddings entra en el contexto aunque BM25
  // ya hubiera llenado el top-k con resultados débiles.
  const guaranteed = new Set<string>([
    ...lexical.slice(0, 3).map((chunk) => chunk.id),
    ...semantic.slice(0, semanticReserve).map((hit) => hit.id),
  ]);

  const picked: RetrievedChunk[] = [];
  const pickedIds = new Set<string>();
  const perDocument = new Map<string, number>();

  const push = (entry: Entry) => {
    if (picked.length >= topK || pickedIds.has(entry.chunk.id)) return;
    const count = perDocument.get(entry.chunk.documentId) ?? 0;
    if (count >= 3) return;
    picked.push({ ...entry.chunk, score: entry.chunk.score + entry.rrf * 10 });
    pickedIds.add(entry.chunk.id);
    perDocument.set(entry.chunk.documentId, count + 1);
  };

  for (const entry of ranked) {
    if (guaranteed.has(entry.chunk.id)) push(entry);
  }
  for (const entry of ranked) {
    if (picked.length >= topK) break;
    push(entry);
  }

  return picked;
}
