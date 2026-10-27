import assert from "node:assert/strict";
import { resolve } from "node:path";
import { before, test } from "node:test";
import { pathToFileURL } from "node:url";

type IngestDocument = {
  id: string;
  title: string;
  sourceUrl: string;
  locale: string;
  organization: string;
  kind: string;
  status: string;
  fetchedAt: string;
  lastReviewedAt?: string;
  lastCheckedAt?: string;
  lastError?: string;
  checksum: string;
  truncated: boolean;
  pages?: number;
  content: string;
};

type MergeCorpus = (input: {
  sources: { id: string }[];
  previous?: IngestDocument[];
  fetched?: IngestDocument[];
  errors?: { id: string; error: string }[];
  now?: string;
}) => {
  documents: (IngestDocument & { status: "official" | "stale" })[];
  stale: string[];
  missing: string[];
  today: string;
};

let mergeCorpus: MergeCorpus;

before(async () => {
  const ingestion = (await import(pathToFileURL(resolve("scripts/ingest-uvigo.mjs")).href)) as {
    mergeCorpus: MergeCorpus;
  };
  mergeCorpus = ingestion.mergeCorpus;
});

function doc(id: string, checksum: string, extra: Record<string, unknown> = {}): IngestDocument {
  return {
    id,
    title: `Documento ${id}`,
    sourceUrl: `https://www.uvigo.gal/${id}`,
    locale: "es",
    organization: "Universidade de Vigo",
    kind: "html",
    status: "official",
    fetchedAt: "2026-01-10",
    lastReviewedAt: "2026-01-10",
    lastCheckedAt: "2026-01-10",
    checksum,
    truncated: false,
    content: `Contenido ${id}`,
    ...extra,
  };
}

test("conserva el contenido cuando el checksum no cambia", () => {
  const previous = [doc("a", "abc")];
  const fetched = [doc("a", "abc")];
  const { documents } = mergeCorpus({
    sources: [{ id: "a" }],
    previous,
    fetched,
    now: "2026-10-27T08:00:00.000Z",
  });

  assert.equal(documents.length, 1);
  assert.equal(documents[0].content, "Contenido a");
  assert.equal(documents[0].status, "official");
  assert.equal(documents[0].fetchedAt, "2026-01-10");
  assert.equal(documents[0].lastReviewedAt, "2026-01-10");
  assert.equal(documents[0].lastCheckedAt, "2026-10-27");
});

test("actualiza la fecha de revisión cuando el contenido cambia", () => {
  const previous = [doc("a", "viejo")];
  const fetched = [doc("a", "nuevo", { content: "Contenido nuevo" })];
  const { documents } = mergeCorpus({
    sources: [{ id: "a" }],
    previous,
    fetched,
    now: "2026-10-27T08:00:00.000Z",
  });

  assert.equal(documents[0].content, "Contenido nuevo");
  assert.equal(documents[0].fetchedAt, "2026-10-27");
  assert.equal(documents[0].lastReviewedAt, "2026-10-27");
  assert.equal(documents[0].status, "official");
});

test("conserva la copia anterior como stale cuando la fuente falla", () => {
  const previous = [doc("a", "abc")];
  const { documents, stale, missing } = mergeCorpus({
    sources: [{ id: "a" }, { id: "b" }],
    previous,
    fetched: [],
    errors: [{ id: "a", error: "HTTP 503" }],
    now: "2026-10-27T08:00:00.000Z",
  });

  assert.deepEqual(stale, ["a"]);
  assert.deepEqual(missing, ["b"]);
  assert.equal(documents.length, 1);
  assert.equal(documents[0].status, "stale");
  assert.equal(documents[0].content, "Contenido a");
  assert.equal(documents[0].lastError, "HTTP 503");
  assert.equal(documents[0].lastCheckedAt, "2026-01-10");
});

test("vuelve a marcar como oficial una fuente stale que responde igual", () => {
  const previous = [doc("a", "abc", { status: "stale", lastError: "HTTP 503" })];
  const fetched = [doc("a", "abc")];
  const { documents, stale } = mergeCorpus({
    sources: [{ id: "a" }],
    previous,
    fetched,
    now: "2026-10-27T08:00:00.000Z",
  });

  assert.deepEqual(stale, []);
  assert.equal(documents[0].status, "official");
  assert.equal(documents[0].lastError, undefined);
  assert.equal(documents[0].lastCheckedAt, "2026-10-27");
});

test("descarta documentos que ya no están en el manifiesto de fuentes", () => {
  const sources = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const previous = [doc("a", "abc"), doc("retirado", "xyz")];
  const fetched = [doc("a", "abc")];
  const { documents } = mergeCorpus({
    sources,
    previous,
    fetched,
    now: "2026-10-27T08:00:00.000Z",
  });

  assert.deepEqual(
    documents.map((item) => item.id),
    ["a"],
  );
});

test("no inventa documentos para fuentes nuevas que fallan", () => {
  const sources = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const { documents, missing } = mergeCorpus({
    sources,
    previous: [],
    fetched: [],
    errors: sources.map((source) => ({ id: source.id, error: "timeout" })),
    now: "2026-10-27T08:00:00.000Z",
  });

  assert.equal(documents.length, 0);
  assert.deepEqual(missing, ["a", "b", "c"]);
});
