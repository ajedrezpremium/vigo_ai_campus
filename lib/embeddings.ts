import { z } from "zod";

/**
 * Cliente de embeddings compatible con OpenRouter (`POST /api/v1/embeddings`).
 *
 * El modelo por defecto es `openai/text-embedding-3-small` porque devuelve 1536
 * dimensiones, que es exactamente la columna `document_chunks.embedding` del
 * esquema. Cambiar a `baai/bge-m3` (1024) es posible con
 * `EMBEDDINGS_MODEL`/`EMBEDDINGS_DIMENSIONS` y la migración de dimensión.
 */
export const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

export type EmbeddingsConfig = {
  model: string;
  dimensions: number;
  batchSize: number;
  enabled: boolean;
  apiKey: string;
  endpoint: string;
};

export function getEmbeddingsConfig(): EmbeddingsConfig {
  const dimensions = Number(process.env.EMBEDDINGS_DIMENSIONS || DEFAULT_EMBEDDING_DIMENSIONS);
  const batchSize = Number(process.env.EMBEDDINGS_BATCH_SIZE || 16);
  return {
    model: process.env.EMBEDDINGS_MODEL || DEFAULT_EMBEDDING_MODEL,
    dimensions: Number.isFinite(dimensions) && dimensions > 0 ? dimensions : DEFAULT_EMBEDDING_DIMENSIONS,
    batchSize: Number.isFinite(batchSize) ? Math.min(Math.max(batchSize, 1), 64) : 16,
    enabled: process.env.EMBEDDINGS_DISABLED !== "true",
    apiKey: process.env.EMBEDDINGS_API_KEY || process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || "",
    endpoint: process.env.EMBEDDINGS_BASE_URL || "https://openrouter.ai/api/v1/embeddings",
  };
}

export function isEmbeddingsConfigured(): boolean {
  const config = getEmbeddingsConfig();
  return config.enabled && Boolean(config.apiKey);
}

export class EmbeddingsNotConfiguredError extends Error {
  constructor() {
    super("Embeddings no configurados: falta EMBEDDINGS_API_KEY o LLM_API_KEY");
    this.name = "EmbeddingsNotConfiguredError";
  }
}

const ResponseSchema = z.object({
  data: z.array(
    z.object({
      embedding: z.array(z.number()),
      index: z.number().int().nonnegative().optional(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
      cost: z.number().optional(),
    })
    .optional(),
});

export type EmbeddingResult = {
  vectors: number[][];
  tokens: number;
  costUsd: number;
};

type BatchPayload = z.infer<typeof ResponseSchema>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /fetch failed|timeout|aborted|ECONNRESET|ETIMEDOUT|EAI_AGAIN|HTTP 429|HTTP 5\d\d/i.test(error.message);
}

async function requestBatch(config: EmbeddingsConfig, input: string[]): Promise<BatchPayload> {
  const body: Record<string, unknown> = { model: config.model, input };
  // Solo se envía `dimensions` cuando se pide explícitamente: algunos modelos
  // no lo soportan y OpenRouter devolvería 400.
  if (process.env.EMBEDDINGS_DIMENSIONS) body.dimensions = config.dimensions;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://vigo-ai-campus.vercel.app",
          "X-Title": "VIGO AI CAMPUS",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });

      if (!res.ok) {
        const text = (await res.text()).slice(0, 240);
        const error = new Error(`HTTP ${res.status}: ${text}`);
        if ((res.status === 429 || res.status >= 500) && attempt < 2) {
          lastError = error;
          await sleep(700 * (attempt + 1));
          continue;
        }
        throw error;
      }

      return ResponseSchema.parse(await res.json());
    } catch (error) {
      lastError = error;
      if (attempt < 2 && isRetryable(error)) {
        await sleep(700 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Embeddings: error desconocido");
}

/**
 * Genera embeddings para una lista de textos. Devuelve los vectores en el mismo
 * orden de entrada y valida la dimensión contra el esquema antes de que el
 * error llegue a Postgres.
 */
export async function embedTexts(
  texts: string[],
  options: { onProgress?: (done: number, total: number) => void } = {},
): Promise<EmbeddingResult> {
  const config = getEmbeddingsConfig();
  if (!config.enabled || !config.apiKey) throw new EmbeddingsNotConfiguredError();

  const clean = texts.map((text) => text.trim()).filter(Boolean);
  if (clean.length !== texts.length) {
    throw new Error("Embeddings: hay textos vacíos en la lista");
  }
  if (!clean.length) return { vectors: [], tokens: 0, costUsd: 0 };

  const vectors: number[][] = [];
  let tokens = 0;
  let costUsd = 0;

  for (let offset = 0; offset < clean.length; offset += config.batchSize) {
    const batch = clean.slice(offset, offset + config.batchSize);
    const payload = await requestBatch(config, batch);

    const ordered = [...payload.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    if (ordered.length !== batch.length) {
      throw new Error(`Embeddings: se esperaban ${batch.length} vectores y llegaron ${ordered.length}`);
    }

    for (const item of ordered) {
      if (item.embedding.length !== config.dimensions) {
        throw new Error(
          `Embeddings: ${config.model} devolvió ${item.embedding.length} dimensiones y el esquema espera ` +
            `${config.dimensions}. Ajusta EMBEDDINGS_MODEL/EMBEDDINGS_DIMENSIONS o aplica la migración de dimensión.`,
        );
      }
      vectors.push(item.embedding);
    }

    tokens += payload.usage?.total_tokens ?? payload.usage?.prompt_tokens ?? 0;
    costUsd += payload.usage?.cost ?? 0;
    options.onProgress?.(Math.min(offset + batch.length, clean.length), clean.length);
  }

  return { vectors, tokens, costUsd };
}

const queryCache = new Map<string, number[]>();
const QUERY_CACHE_LIMIT = 256;

/** Embedding de una consulta con caché en memoria (las preguntas se repiten). */
export async function embedQuery(text: string): Promise<number[]> {
  const config = getEmbeddingsConfig();
  const key = `${config.model}:${text}`;
  const cached = queryCache.get(key);
  if (cached) return cached;

  const { vectors } = await embedTexts([text]);
  const vector = vectors[0];
  if (!vector) throw new Error("Embeddings: respuesta vacía para la consulta");

  queryCache.set(key, vector);
  if (queryCache.size > QUERY_CACHE_LIMIT) {
    const oldest = queryCache.keys().next().value;
    if (oldest) queryCache.delete(oldest);
  }
  return vector;
}

/** pgvector acepta la representación textual `[0.1,0.2,...]`. */
export function toVectorLiteral(vector: ArrayLike<number>): string {
  return `[${Array.from(vector, (value) => (Number.isFinite(value) ? value : 0).toFixed(8)).join(",")}]`;
}

/** Estimación conservadora para mostrar coste antes de llamar a la API. */
export function estimateEmbeddingTokens(texts: string[]): number {
  return Math.ceil(texts.reduce((sum, text) => sum + text.length, 0) / 4);
}

export function resetEmbeddingCache() {
  queryCache.clear();
}
