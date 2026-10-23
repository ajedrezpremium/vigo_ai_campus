import { DEMO_DOCUMENTS } from "@/data/demo-corpus";

export type RetrievedChunk = {
  id: string;
  documentId: string;
  title: string;
  sourceUrl: string;
  snippet: string;
  score: number;
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

const STOPWORDS = new Set([
  "que",
  "para",
  "con",
  "una",
  "los",
  "las",
  "del",
  "por",
  "como",
  "mas",
  "sin",
  "the",
  "and",
  "for",
]);

export function retrieve(query: string, topK = 4): RetrievedChunk[] {
  const qTokens = tokenize(query).filter((t) => !STOPWORDS.has(t));
  if (qTokens.length === 0) return [];

  const chunks: RetrievedChunk[] = [];
  for (const doc of DEMO_DOCUMENTS) {
    const sentences = doc.content.split(/(?<=[.!?])\s+/);
    const windowSize = 2;
    for (let i = 0; i < sentences.length; i++) {
      const window = sentences.slice(i, i + windowSize).join(" ");
      const wTokens = tokenize(window);
      let score = 0;
      for (const qt of qTokens) {
        const freq = wTokens.filter((t) => t === qt).length;
        score += freq * 2;
        if (wTokens.includes(qt)) score += 1;
      }
      // phrase bonus
      const qPhrase = qTokens.join(" ");
      if (window.toLowerCase().includes(qPhrase)) score += 5;
      if (score > 0) {
        chunks.push({
          id: `${doc.id}-${i}`,
          documentId: doc.id,
          title: doc.title,
          sourceUrl: doc.sourceUrl,
          snippet: window.trim(),
          score,
        });
      }
    }
  }

  const top = chunks.sort((a, b) => b.score - a.score).slice(0, topK);
  return top;
}

export function topScore(chunks: RetrievedChunk[]) {
  return chunks.length ? chunks[0].score : 0;
}
