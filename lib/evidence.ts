import { tokenize, type RetrievedChunk } from "@/lib/retrieval";

/**
 * Términos que aparecen en casi cualquier consulta sobre la UVigo y que no
 * aportan evidencia por sí solos. Se excluyen del cálculo de cobertura para
 * que "Vigo" o "campus" no hagan parecer relevante un fragmento cualquiera.
 */
const GENERIC_TERMS = new Set([
  "vigo",
  "uvigo",
  "universidade",
  "universidad",
  "campus",
  "campu",
  "galicia",
  "ourense",
  "pontevedra",
  "cuesta",
  "cuestan",
]);

/** Cobertura mínima de términos de la consulta en el contexto recuperado. */
export const MIN_EVIDENCE_COVERAGE = 0.6;

const OTHER_UNIVERSITY = /\b(?:universidade|universidad)\s+de\s+(?:santiago|a\s+coruña|coruna|le[oó]n|oviedo|porto)\b|\b(?:usc|udc)\b/i;
const PERSONAL_DATA = /\b(?:mis|mi)\s+(?:notas|calificaciones|expediente)\b|\bnotas\s+(?:saqu[eé]|obtuve|tengo)(?=\s|[?.!,]|$)|\b(?:contraseña|password)\b|\btel[eé]fono\s+personal\b/i;
const OUT_OF_DOMAIN = /\b(?:sergas|cita\s+m[eé]dica|tarjeta\s+sanitaria|alquiler|hipoteca|piscina\s+municipal)\b/i;

export type OutOfScopeReason = "other_university" | "personal_data" | "out_of_domain";

/**
 * Consultas que la demo no debe intentar responder aunque el retrieval
 * encuentre términos sueltos: otra universidad, datos personales o servicios
 * que no son académicos.
 */
export function detectOutOfScope(query: string): OutOfScopeReason | null {
  if (OTHER_UNIVERSITY.test(query)) return "other_university";
  if (PERSONAL_DATA.test(query)) return "personal_data";
  if (OUT_OF_DOMAIN.test(query)) return "out_of_domain";
  return null;
}

export function evidenceCoverage(query: string, chunks: RetrievedChunk[]): number {
  if (!chunks.length) return 0;
  const terms = [...new Set(tokenize(query))].filter((term) => !GENERIC_TERMS.has(term));
  if (!terms.length) return 1;

  // Se mide el mejor fragmento, no la unión de todos: así una palabra suelta
  // en un documento de navegación no convierte en relevante otro distinto.
  let best = 0;
  for (const chunk of chunks) {
    const context = new Set(tokenize(`${chunk.title} ${chunk.documentIntro} ${chunk.snippet}`));
    const matched = terms.filter((term) => context.has(term)).length;
    best = Math.max(best, matched / terms.length);
  }
  return best;
}

/**
 * Decide si hay evidencia suficiente para responder. La usan tanto la ruta de
 * chat como el arnés de evaluación, para que lo medido sea lo que se publica.
 *
 * La similitud semántica NO sustituye a esta comprobación: en el set de
 * evaluación hay consultas fuera de alcance con similitud 0,56 y preguntas
 * válidas con 0,44, así que un umbral de coseno no separa ambas con seguridad.
 */
export function shouldAbstain(query: string, chunks: RetrievedChunk[]): boolean {
  if (!chunks.length) return true;
  if (detectOutOfScope(query)) return true;
  return evidenceCoverage(query, chunks) < MIN_EVIDENCE_COVERAGE;
}
