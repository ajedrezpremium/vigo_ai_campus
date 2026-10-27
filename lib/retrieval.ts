import { DEMO_DOCUMENTS } from "@/data/demo-corpus";
import { OFFICIAL_DOCUMENTS } from "@/data/uvigo-corpus";

export type SourceType = "official" | "demo";

export type RetrievedChunk = {
  id: string;
  documentId: string;
  title: string;
  sourceUrl: string;
  snippet: string;
  score: number;
  confidence: number;
  sourceType: SourceType;
  organization: string;
  locale: "es" | "gl" | "en";
  kind: "html" | "pdf" | "demo";
  reviewedAt: string;
  truncated: boolean;
  chunkIndex: number;
  documentIntro: string;
  /** Similitud coseno cuando el fragmento llega del tramo semántico. */
  semantic?: number;
};

type CorpusDocument = {
  id: string;
  title: string;
  sourceUrl: string;
  content: string;
  locale: "es" | "gl" | "en";
  organization: string;
  status: "official" | "stale" | "demo" | "approved";
  reviewedAt: string;
  kind: "html" | "pdf" | "demo";
  truncated: boolean;
};

type IndexedChunk = CorpusDocument & {
  chunkIndex: number;
  text: string;
  lower: string;
  tokens: string[];
  termFreq: Map<string, number>;
  length: number;
};

const DEMO_ORGANIZATION = "Universidade de Vigo (demo no oficial)";

const CORPUS: CorpusDocument[] = [
  ...OFFICIAL_DOCUMENTS.map((doc) => ({
    id: doc.id,
    title: doc.title,
    sourceUrl: doc.sourceUrl,
    content: doc.content,
    locale: doc.locale,
    organization: doc.organization,
    status: doc.status,
    reviewedAt: doc.lastReviewedAt ?? doc.fetchedAt,
    kind: doc.kind,
    truncated: doc.truncated,
  })),
  ...DEMO_DOCUMENTS.map((doc) => ({
    id: doc.id,
    title: doc.title,
    sourceUrl: doc.sourceUrl,
    content: doc.content,
    locale: doc.locale,
    organization: DEMO_ORGANIZATION,
    status: doc.status,
    reviewedAt: doc.reviewedAt,
    kind: "demo" as const,
    truncated: false,
  })),
];

const STOPWORDS = new Set([
  "que",
  "para",
  "con",
  "una",
  "unos",
  "unas",
  "los",
  "las",
  "del",
  "por",
  "como",
  "mas",
  "sin",
  "sus",
  "este",
  "esta",
  "estos",
  "estas",
  "donde",
  "cuando",
  "cuanto",
  "cual",
  "sobre",
  "hay",
  "puedo",
  "puede",
  "puedes",
  "quiero",
  "necesito",
  "tiene",
  "tienen",
  "hacer",
  "pido",
  "pedir",
  "ofrece",
  "ofrecer",
  "presenta",
  "presentar",
  "consulto",
  "consultar",
  "saber",
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "what",
  "how",
  "where",
  "when",
  "para",
  "polo",
  "pola",
  "dos",
  "das",
  "num",
  "nun",
  "nunha",
  "coa",
  "co",
]);

/**
 * Stemming ligero para español/galego. No pretende ser Snowball: resuelve las
 * variantes que aparecen en las consultas reales (matrícula/matriculo,
 * beca/becas, grado/grados, calendario/calendarios...).
 */
function stem(token: string): string {
  const t = token;
  if (t.startsWith("matricul")) return "matricula";
  if (t.startsWith("bec")) return "beca";
  if (t.startsWith("grad")) return "grado";
  if (t.startsWith("calend")) return "calendario";
  if (t.startsWith("movil")) return "movilidad";
  if (t.startsWith("asignatur")) return "asignatura";
  if (t.startsWith("titul")) return "titulacion";
  if (t.startsWith("universid")) return "universidad";
  if (t.startsWith("profesor")) return "profesor";
  if (t.startsWith("estudi")) return "estudiante";
  if (t.startsWith("secretar")) return "secretaria";
  if (t.startsWith("solicit")) return "solicitud";
  if (t.startsWith("tramit")) return "tramite";
  if (t.startsWith("asesor")) return "asesor";
  if (t.startsWith("naci") || t.startsWith("nace")) return "naci";
  if (t.endsWith("es") && t.length > 4) return t.slice(0, -2);
  if (t.endsWith("s") && t.length > 3) return t.slice(0, -1);
  return t;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
    .map(stem);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildChunks(doc: CorpusDocument, maxChars = 720): string[] {
  const blocks = doc.content
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const units: string[] = [];
  for (const block of blocks) {
    if (block.length <= maxChars) {
      units.push(block);
      continue;
    }
    const sentences = splitSentences(block);
    let current = "";
    for (const sentence of sentences) {
      if ((current + " " + sentence).trim().length > maxChars && current) {
        units.push(current.trim());
        current = sentence;
      } else {
        current = `${current} ${sentence}`.trim();
      }
    }
    if (current) units.push(current);
  }

  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    if ((current + "\n" + unit).trim().length > maxChars && current) {
      chunks.push(current.trim());
      current = unit;
    } else {
      current = `${current}\n${unit}`.trim();
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [doc.content.slice(0, maxChars)];
}

function buildIndex(): IndexedChunk[] {
  const index: IndexedChunk[] = [];
  for (const doc of CORPUS) {
    buildChunks(doc).forEach((text, chunkIndex) => {
      const tokens = tokenize(text);
      const termFreq = new Map<string, number>();
      for (const token of tokens) termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
      index.push({
        ...doc,
        chunkIndex,
        text,
        lower: text.toLowerCase(),
        tokens,
        termFreq,
        length: Math.max(tokens.length, 1),
      });
    });
  }
  return index;
}

const INDEX = buildIndex();
const AVG_LENGTH = INDEX.reduce((sum, c) => sum + c.length, 0) / Math.max(INDEX.length, 1);

const DOC_FREQ = new Map<string, number>();
for (const chunk of INDEX) {
  for (const term of new Set(chunk.tokens)) {
    DOC_FREQ.set(term, (DOC_FREQ.get(term) ?? 0) + 1);
  }
}

function idf(term: string): number {
  const df = DOC_FREQ.get(term) ?? 0;
  return Math.log(1 + (INDEX.length - df + 0.5) / (df + 0.5));
}

const TITLE_CACHE = new Map<string, Set<string>>();
function titleTokens(title: string): Set<string> {
  const cached = TITLE_CACHE.get(title);
  if (cached) return cached;
  const tokens = new Set(tokenize(title));
  TITLE_CACHE.set(title, tokens);
  return tokens;
}

export type RetrieveOptions = {
  topK?: number;
  locale?: string;
  includeDemo?: boolean;
  minConfidence?: number;
};

export function retrieve(query: string, options: RetrieveOptions = {}): RetrievedChunk[] {
  const topK = options.topK ?? 4;
  const includeDemo = options.includeDemo ?? true;
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0) return [];

  const k1 = 1.35;
  const b = 0.72;
  const results: RetrievedChunk[] = [];

  for (const chunk of INDEX) {
    if (!includeDemo && chunk.kind === "demo") continue;

    let score = 0;
    let matched = 0;
    const titleTerms = titleTokens(chunk.title);
    for (const term of queryTokens) {
      const tf = chunk.termFreq.get(term) ?? 0;
      if (!tf) continue;
      matched += 1;
      const termIdf = idf(term);
      score += termIdf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * chunk.length) / AVG_LENGTH)));
      if (titleTerms.has(term)) score += termIdf * 2.4;
    }
    if (matched === 0) continue;

    const phrase = queryTokens.join(" ");
    if (phrase.length > 4 && chunk.lower.includes(phrase)) score += 4.5;

    const authority = chunk.kind === "demo" ? 0.58 : 1.58;
    score *= authority;
    // Una fuente obsoleta sigue siendo evidencia válida, pero cede ante una
    // copia vigente del mismo tema.
    if (chunk.status === "stale") score *= 0.82;

    // Términos de acción: si el título del documento contiene el término
    // principal de la consulta, ese documento debe liderar el ranking.
    const actionTerms = ["matricula", "beca", "calendario", "movilidad", "biblioteca", "solicitud", "tramite", "centro", "asesor"];
    const actionMatch = actionTerms.some((term) => queryTokens.includes(term) && titleTerms.has(term));
    if (actionMatch) score *= 1.9;
    if (options.locale && chunk.locale === options.locale) score *= 1.08;
    // Los primeros fragmentos suelen contener la introducción y los pasos principales.
    score += Math.max(0, 0.9 - chunk.chunkIndex * 0.18);

    const coverage = matched / queryTokens.length;
    if (coverage < 0.2 && chunk.kind === "demo") continue;

    results.push({
      id: `${chunk.id}-${chunk.chunkIndex}`,
      documentId: chunk.id,
      title: chunk.title,
      sourceUrl: chunk.sourceUrl,
      snippet: chunk.text,
      score,
      confidence: coverage,
      sourceType: chunk.kind === "demo" ? "demo" : "official",
      organization: chunk.organization,
      locale: chunk.locale,
      kind: chunk.kind,
      reviewedAt: chunk.reviewedAt,
      truncated: chunk.truncated,
      chunkIndex: chunk.chunkIndex,
      documentIntro: chunk.content.slice(0, 1600),
    });
  }

  results.sort((a, b2) => b2.score - a.score || b2.confidence - a.confidence);

  // Evita cuatro fragmentos del mismo documento si hay alternativas.
  const picked: RetrievedChunk[] = [];
  const perDocument = new Map<string, number>();
  for (const result of results) {
    const count = perDocument.get(result.documentId) ?? 0;
    if (count >= 3) continue;
    picked.push(result);
    perDocument.set(result.documentId, count + 1);
    if (picked.length >= topK) break;
  }

  return picked;
}

export function topScore(chunks: RetrievedChunk[]): number {
  return chunks.length ? chunks[0].score : 0;
}

export function retrievalConfidence(chunks: RetrievedChunk[]): number {
  return chunks.length ? chunks[0].confidence : 0;
}

export function getCorpusStats() {
  const official = CORPUS.filter((d) => d.kind !== "demo");
  return {
    documents: CORPUS.length,
    officialDocuments: official.length,
    staleDocuments: official.filter((d) => d.status === "stale").length,
    demoDocuments: CORPUS.length - official.length,
    chunks: INDEX.length,
    characters: CORPUS.reduce((sum, d) => sum + d.content.length, 0),
    pdfDocuments: official.filter((d) => d.kind === "pdf").length,
    lastCapture: official
      .map((d) => d.reviewedAt)
      .sort()
      .at(-1) ?? null,
    organizations: [...new Set(CORPUS.map((d) => d.organization))],
  };
}

export type CorpusChunk = {
  id: string;
  documentId: string;
  chunkIndex: number;
  title: string;
  sourceUrl: string;
  text: string;
  locale: "es" | "gl" | "en";
  organization: string;
  kind: "html" | "pdf" | "demo";
  status: "official" | "stale" | "demo" | "approved";
  sourceType: SourceType;
  reviewedAt: string;
  truncated: boolean;
  documentIntro: string;
};

/**
 * Fragmentos exactos que se indexan en `document_chunks`. La ingesta y el
 * script de embeddings comparten esta función para que el texto vectorizado
 * sea el mismo que ve BM25.
 */
export function listCorpusChunks(): CorpusChunk[] {
  return INDEX.map((chunk) => ({
    id: `${chunk.id}-${chunk.chunkIndex}`,
    documentId: chunk.id,
    chunkIndex: chunk.chunkIndex,
    title: chunk.title,
    sourceUrl: chunk.sourceUrl,
    text: chunk.text,
    locale: chunk.locale,
    organization: chunk.organization,
    kind: chunk.kind,
    status: chunk.status,
    sourceType: chunk.kind === "demo" ? "demo" : "official",
    reviewedAt: chunk.reviewedAt,
    truncated: chunk.truncated,
    documentIntro: chunk.content.slice(0, 1600),
  }));
}

export function listCorpusDocuments() {
  return CORPUS.map((doc) => ({
    id: doc.id,
    title: doc.title,
    sourceUrl: doc.sourceUrl,
    organization: doc.organization,
    locale: doc.locale,
    kind: doc.kind,
    status: doc.status,
    reviewedAt: doc.reviewedAt,
    truncated: doc.truncated,
    characters: doc.content.length,
  }));
}
