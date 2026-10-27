import assert from "node:assert/strict";
import test from "node:test";
import {
  cosineSimilarity,
  fuseRetrieval,
  parseVector,
  semanticHitToChunk,
  type SemanticHit,
} from "../lib/hybrid";
import type { RetrievedChunk } from "../lib/retrieval";

function chunk(overrides: Partial<RetrievedChunk> & Pick<RetrievedChunk, "id" | "documentId">): RetrievedChunk {
  return {
    title: `Documento ${overrides.documentId}`,
    sourceUrl: `https://www.uvigo.gal/${overrides.documentId}`,
    snippet: "Contenido de prueba con matrícula y plazos.",
    score: 3,
    confidence: 0.5,
    sourceType: "official",
    organization: "Universidade de Vigo",
    locale: "es",
    kind: "html",
    reviewedAt: "2026-10-01",
    truncated: false,
    chunkIndex: 0,
    documentIntro: "Introducción del documento.",
    ...overrides,
  };
}

function hit(overrides: Partial<SemanticHit> & Pick<SemanticHit, "id" | "documentId">): SemanticHit {
  return {
    chunkIndex: 0,
    content: "Contenido recuperado por similitud semántica.",
    similarity: 0.42,
    metadata: {
      corpusId: overrides.documentId,
      title: `Documento ${overrides.documentId}`,
      sourceUrl: `https://www.uvigo.gal/${overrides.documentId}`,
      locale: "es",
      kind: "html",
      sourceType: "official",
      organization: "Universidade de Vigo",
      reviewedAt: "2026-10-01",
      documentIntro: "Introducción del documento.",
    },
    ...overrides,
  };
}

test("la similitud coseno cubre idénticos, ortogonales y dimensiones distintas", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([1, 2], [1]), 0);
  assert.equal(cosineSimilarity([], []), 0);
  assert.ok(Math.abs(cosineSimilarity([1, 1], [1, 0]) - Math.SQRT1_2) < 1e-12);
});

test("parseVector acepta el formato de PostgREST, arrays y rechaza basura", () => {
  assert.deepEqual(parseVector("[0.5, 1, -2]"), [0.5, 1, -2]);
  assert.deepEqual(parseVector("{0.5,1}"), [0.5, 1]);
  assert.deepEqual(parseVector([0.5, 1]), [0.5, 1]);
  assert.deepEqual(parseVector("[]"), []);
  assert.equal(parseVector("no-es-un-vector"), null);
  assert.equal(parseVector("[1, dos]"), null);
  assert.equal(parseVector(null), null);
});

test("un hit semántico se convierte en un fragmento citable", () => {
  const converted = semanticHitToChunk(hit({ id: "uvigo-becas-1", documentId: "uvigo-becas", similarity: 0.55, chunkIndex: 1 }));

  assert.equal(converted.id, "uvigo-becas-1");
  assert.equal(converted.title, "Documento uvigo-becas");
  assert.equal(converted.sourceUrl, "https://www.uvigo.gal/uvigo-becas");
  assert.equal(converted.sourceType, "official");
  assert.equal(converted.confidence, 0.55);
  assert.ok(Math.abs(converted.score - 3.3) < 1e-9);
  assert.equal(converted.chunkIndex, 1);
});

test("la fusión RRF prioriza lo que aparece en ambos rankings", () => {
  const lexical = [
    chunk({ id: "a-0", documentId: "a", confidence: 0.4 }),
    chunk({ id: "b-0", documentId: "b", confidence: 0.4 }),
    chunk({ id: "a-1", documentId: "a", chunkIndex: 1, confidence: 0.3 }),
  ];
  const semantic = [
    hit({ id: "b-0", documentId: "b", similarity: 0.62 }),
    hit({ id: "c-0", documentId: "c", similarity: 0.51 }),
  ];

  const fused = fuseRetrieval(lexical, semantic, 4);
  assert.deepEqual(
    fused.map((item) => item.id),
    ["b-0", "c-0", "a-0", "a-1"],
  );
  // b-0 conserva la mejor confianza de los dos rankings.
  assert.equal(fused[0].confidence, 0.62);
});

test("con un ancla léxica fuerte el semántico no desplaza el top 3", () => {
  const lexical = ["a", "b", "c", "d", "e"].map((documentId) =>
    chunk({ id: `${documentId}-0`, documentId, confidence: 0.9 }),
  );
  const semantic = [
    hit({ id: "x-0", documentId: "x", similarity: 0.66 }),
    hit({ id: "y-0", documentId: "y", similarity: 0.64 }),
    hit({ id: "z-0", documentId: "z", similarity: 0.6 }),
  ];

  const fused = fuseRetrieval(lexical, semantic, 5);
  assert.deepEqual(
    fused.map((item) => item.id),
    ["a-0", "b-0", "c-0", "x-0", "d-0"],
  );
});

test("la fusión respeta topK y el máximo de tres fragmentos por documento", () => {
  const lexical = ["a", "b", "c", "d"].map((documentId) =>
    chunk({ id: `${documentId}-0`, documentId, confidence: 0.2 }),
  );
  const semantic = [
    hit({ id: "a-1", documentId: "a", chunkIndex: 1 }),
    hit({ id: "a-2", documentId: "a", chunkIndex: 2 }),
    hit({ id: "a-3", documentId: "a", chunkIndex: 3 }),
    hit({ id: "a-4", documentId: "a", chunkIndex: 4 }),
  ];

  const fused = fuseRetrieval(lexical, semantic, 3);
  assert.equal(fused.length, 3);
  assert.equal(fused.filter((item) => item.documentId === "a").length, 3);
  assert.ok(!fused.some((item) => item.id === "a-4"));
});
