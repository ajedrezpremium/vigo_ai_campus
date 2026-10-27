import { fuseRetrieval } from "@/lib/hybrid";
import { retrieve, type RetrieveOptions, type RetrievedChunk } from "@/lib/retrieval";
import { searchSemantic } from "@/lib/semantic";

export type RetrieveAsyncOptions = RetrieveOptions & {
  organizationId?: string | null;
  /** Desactiva el tramo semántico (evaluación determinista, tests, CI). */
  semantic?: boolean;
  semanticThreshold?: number;
};

/**
 * Recuperación híbrida: BM25 + pgvector.
 *
 * Si el tramo semántico falla (sin clave, sin migración, timeout), devuelve el
 * resultado léxico sin romper el chat. La decisión de abstenerse sigue
 * calculándose con `shouldAbstain()` sobre el texto recuperado.
 */
export async function retrieveAsync(
  query: string,
  options: RetrieveAsyncOptions = {},
): Promise<RetrievedChunk[]> {
  const { semantic = true, semanticThreshold, organizationId, ...lexicalOptions } = options;
  const lexical = retrieve(query, lexicalOptions);
  if (!semantic) return lexical;

  try {
    const hits = (await searchSemantic(query, {
      topK: Math.max(lexicalOptions.topK ?? 4, 8),
      threshold: semanticThreshold ?? 0.2,
      organizationId,
    })).filter((hit) =>
      lexicalOptions.includeDemo === false ? hit.metadata.sourceType !== "demo" : true,
    );
    if (!hits.length) return lexical;
    return fuseRetrieval(lexical, hits, lexicalOptions.topK ?? 4);
  } catch (error) {
    console.warn(
      "[retrieval] tramo semántico omitido:",
      error instanceof Error ? error.message : error,
    );
    return lexical;
  }
}
