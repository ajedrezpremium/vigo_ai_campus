#!/usr/bin/env node
/**
 * Ingesta de fuentes oficiales de la Universidade de Vigo.
 *
 * Uso: npm run ingest:uvigo
 *
 * - Descarga páginas HTML y PDFs públicos de uvigo.gal.
 * - Extrae el contenido principal (no navegación ni pie).
 * - Genera data/uvigo-corpus.ts con texto, URL oficial, fecha de captura y checksum.
 *
 * La ingesta es incremental: si una fuente no cambió se conserva el contenido
 * ya versionado (solo se actualiza `lastCheckedAt`) y si una fuente falla se
 * mantiene la última copia válida marcada como `stale`, en lugar de eliminarla.
 *
 * El corpus generado se versiona para que el despliegue sea reproducible y no
 * dependa de la red en tiempo de ejecución. Vuelve a ejecutar este script para
 * refrescar las fuentes.
 */
import * as cheerio from "cheerio";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_TS = resolve(ROOT, "data/uvigo-corpus.ts");
const OUT_JSON = resolve(ROOT, "data/uvigo-corpus.json");
const BASE = "https://www.uvigo.gal";
const UA = "VigoAICampusBot/1.0 (+https://vigo-ai-campus.vercel.app; academic TFG demo)";
const MAX_CHARS = 6000;

const HTML_SOURCES = [
  { id: "uvigo-vistazo", path: "/es/universidad/conocenos/uvigo-vistazo", title: "Historia de la Universidade de Vigo: nacimos en 1990" },
  { id: "uvigo-conocenos", path: "/es/universidad/conocenos", title: "Conócenos: historia y datos de la Universidade de Vigo" },
  { id: "uvigo-institucional", path: "/es/universidad", title: "La Universidade de Vigo" },
  { id: "uvigo-estudiar", path: "/es/estudiar", title: "Estudiar en la Universidade de Vigo" },
  { id: "uvigo-grados", path: "/es/estudiar/que-estudiar/estudios-grado", title: "Estudios de grado" },
  { id: "uvigo-acceder", path: "/es/estudiar/acceder", title: "Cómo acceder a la Universidade de Vigo" },
  { id: "uvigo-gestiones", path: "/es/estudiar/gestiones-estudiantes", title: "Gestiones para estudiantes" },
  { id: "uvigo-matricula", path: "/es/estudiar/gestiones-estudiantes/matriculate", title: "Matrícula" },
  { id: "uvigo-matricula-grado", path: "/es/node/5578", title: "Matrícula de grado: procedimiento y plazos" },
  { id: "uvigo-matricula-master", path: "/es/node/192", title: "Matrícula de máster: preinscripción y plazos" },
  { id: "uvigo-matricula-doctorado", path: "/es/node/5579", title: "Matrícula de doctorado: plazos y trámites" },
  { id: "uvigo-becas", path: "/es/estudiar/gestiones-estudiantes/becas", title: "Becas y ayudas" },
  { id: "uvigo-asesoramiento", path: "/es/estudiar/te-asesoramos", title: "Te asesoramos" },
  { id: "uvigo-empleabilidad", path: "/es/estudiar/empleabilidad", title: "Empleabilidad" },
  { id: "uvigo-biblioteca", path: "/es/universidad/biblioteca", title: "La Biblioteca universitaria" },
  { id: "uvigo-perfil-estudiantes", path: "/es/perfil-estudiantes", title: "Accesos rápidos para estudiantes" },
  { id: "uvigo-perfil-pas", path: "/es/perfil-pas", title: "Accesos rápidos para el PAS" },
  { id: "uvigo-perfil-pdi", path: "/es/perfil-pdi", title: "Accesos rápidos para el PDI" },
  { id: "uvigo-campus", path: "/es/campus", title: "Vida en el campus" },
  { id: "uvigo-tic", path: "/es/universidad/servicios-informaticos", title: "Servicios informáticos" },
  {
    id: "uvigo-movilidad",
    path: "/es/internacional/programas-movilidad/estudiantes/estudiantes-salientes",
    title: "Movilidad internacional: estudiantes salientes",
  },
  { id: "uvigo-centros", path: "/es/estudiar/organizacion-academica/centros", title: "Centros de la Universidade de Vigo" },
  { id: "uvigo-calendario", path: "/es/universidad/informacion-institucional/calendario", title: "Calendario académico" },
  {
    id: "uvigo-normativa",
    path: "/es/universidad/informacion-institucional/archivo-normativa",
    title: "Archivo de normativa",
  },
];

const PDF_SOURCES = [
  {
    id: "uvigo-calendario-2026-27-pdf",
    path: "/sites/uvigo.gal/files/docs/universidade/institucional/calendario/Calendario_Academico_UVigo_2026-27.pdf",
    title: "Calendario académico UVigo 2026/2027 (PDF oficial)",
  },
  {
    id: "uvigo-cronograma-2026-27-pdf",
    path: "/sites/uvigo.gal/files/docs/universidade/institucional/calendario/Cronograma_UVigo_2026-27.pdf",
    title: "Cronograma del curso 2026/2027 (PDF oficial)",
  },
];

const NOISE = [
  /^inicio$/i,
  /^buscar$/i,
  /^compartir$/i,
  /^imprimir$/i,
  /^facebook$/i,
  /^twitter$/i,
  /^youtube$/i,
  /^instagram$/i,
  /^linkedin$/i,
  /^a\s*~\s*z$/i,
  /^saltar al contenido/i,
  /^este sitio utiliza cookies/i,
  /^pol[ií]tica de cookies$/i,
  /aceptar todas las cookies/i,
  /^menú$/i,
  /^cerrar$/i,
  /^campus$/i,
  /^rama de conocimiento$/i,
  /^modalidad/i,
  /^presencial$/i,
  /^virtual$/i,
];

function cleanText(value) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isNoise(line) {
  if (!line) return true;
  if (line.length < 4) return true;
  return NOISE.some((re) => re.test(line));
}

function extractHtml(html) {
  const $ = cheerio.load(html);
  const root = $(".region-content").first();
  if (!root.length) return "";

  root.find("script,style,noscript,iframe,form,svg,picture,img,nav,footer,header,.social-links,.breadcrumb").remove();

  const lines = [];
  const seen = new Set();
  root.find("h1,h2,h3,h4,p,li,th,td").each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    let text;
    if (tag === "li") {
      const clone = $(el).clone();
      clone.find(".list-detail-academic-degree").remove();
      const anchor = clone.find("a").first();
      text = cleanText(anchor.length ? anchor.text() : clone.text());
    } else {
      text = cleanText($(el).clone().children("ul,ol,table,div").remove().end().text());
    }
    if (isNoise(text)) return;
    const isHeading = tag?.startsWith("h");
    if (!isHeading && text.length < 20) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(isHeading ? `\n${text}` : `- ${text}`);
  });

  // Fallback: some pages keep content outside the usual region.
  const fallback = cleanText(root.text());
  const body = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return body.length > 200 ? body : fallback;
}

function truncate(text, max = MAX_CHARS) {
  if (text.length <= max) return { text, truncated: false };
  const cut = text.lastIndexOf(".", max);
  return { text: text.slice(0, cut > max * 0.6 ? cut + 1 : max).trim(), truncated: true };
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": UA, accept: "text/html,application/pdf;q=0.9,*/*;q=0.8" },
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
  throw lastError;
}

async function ingestHtml(source) {
  const url = `${BASE}${source.path}`;
  const res = await fetchWithRetry(url);
  const html = await res.text();
  const raw = extractHtml(html);
  const { text, truncated } = truncate(raw);
  if (text.length < 150) throw new Error(`contenido insuficiente (${text.length} caracteres)`);
  return {
    id: source.id,
    title: source.title,
    sourceUrl: url,
    locale: "es",
    organization: "Universidade de Vigo",
    kind: "html",
    status: "official",
    fetchedAt: new Date().toISOString().slice(0, 10),
    checksum: createHash("sha256").update(text).digest("hex").slice(0, 16),
    truncated,
    content: text,
  };
}

async function ingestPdf(source) {
  const url = `${BASE}${source.path}`;
  const res = await fetchWithRetry(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  const parsed = await pdf(buffer);
  const raw = cleanText(parsed.text).replace(/(\d+\.\s)/g, "\n$1");
  const { text, truncated } = truncate(raw, 9000);
  if (text.length < 150) throw new Error(`PDF sin texto extraíble (${parsed.numpages} páginas)`);
  return {
    id: source.id,
    title: source.title,
    sourceUrl: url,
    locale: "gl",
    organization: "Universidade de Vigo",
    kind: "pdf",
    status: "official",
    fetchedAt: new Date().toISOString().slice(0, 10),
    checksum: createHash("sha256").update(text).digest("hex").slice(0, 16),
    truncated,
    pages: parsed.numpages,
    content: text,
  };
}

function toTs(documents) {
  const header = `// GENERADO AUTOMÁTICAMENTE por scripts/ingest-uvigo.mjs
// No editar a mano. Ejecuta \`npm run ingest:uvigo\` para refrescar las fuentes.
// Última captura: ${new Date().toISOString()}

export type OfficialDocument = {
  id: string;
  title: string;
  sourceUrl: string;
  locale: "es" | "gl" | "en";
  organization: string;
  kind: "html" | "pdf";
  status: "official" | "stale";
  /** Fecha en la que se capturó el contenido publicado. */
  fetchedAt: string;
  /** Última vez que el contenido se dio por bueno (humano o ingesta). */
  lastReviewedAt: string;
  /** Última comprobación HTTP correcta de la fuente. */
  lastCheckedAt: string;
  /** Motivo por el que la fuente quedó obsoleta, si aplica. */
  lastError?: string;
  checksum: string;
  truncated: boolean;
  pages?: number;
  content: string;
};

export const OFFICIAL_DOCUMENTS: OfficialDocument[] = `;
  return `${header}${JSON.stringify(documents, null, 2)} as const;\n`;
}

/**
 * Fusiona lo descargado en esta ejecución con el corpus anterior.
 *
 * Reglas:
 * - Fuente descargada y checksum igual: se conserva el contenido y
 *   `lastReviewedAt`; solo avanza `lastCheckedAt`.
 * - Fuente descargada con contenido nuevo: pasa a `official` con la fecha de hoy.
 * - Fuente que falla: se conserva la copia anterior como `stale` y se anota el
 *   error. Nunca se borra evidencia válida por un fallo de red puntual.
 *
 * Es una función pura para poder probarla sin red.
 */
export function mergeCorpus({ sources, previous = [], fetched = [], errors = [], now = new Date().toISOString() }) {
  const today = now.slice(0, 10);
  const previousById = new Map(previous.map((doc) => [doc.id, doc]));
  const fetchedById = new Map(fetched.map((doc) => [doc.id, doc]));
  const errorById = new Map(errors.map((entry) => [entry.id, entry.error]));
  const documents = [];
  const stale = [];
  const missing = [];

  for (const source of sources) {
    const fresh = fetchedById.get(source.id);
    const old = previousById.get(source.id);

    if (fresh) {
      const unchanged = Boolean(old && old.checksum === fresh.checksum);
      const lastReviewedAt = unchanged ? (old.lastReviewedAt ?? old.fetchedAt ?? today) : today;
      documents.push({
        ...fresh,
        status: "official",
        fetchedAt: unchanged ? (old.fetchedAt ?? lastReviewedAt) : today,
        lastReviewedAt,
        lastCheckedAt: today,
      });
      continue;
    }

    if (old) {
      documents.push({
        ...old,
        status: "stale",
        lastReviewedAt: old.lastReviewedAt ?? old.fetchedAt ?? today,
        lastCheckedAt: old.lastCheckedAt ?? old.fetchedAt ?? today,
        lastError: errorById.get(source.id) ?? old.lastError ?? "error desconocido",
      });
      stale.push(source.id);
      continue;
    }

    missing.push(source.id);
  }

  return { documents, stale, missing, today };
}

async function readPreviousCorpus() {
  try {
    const raw = await readFile(OUT_JSON, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.documents) ? parsed.documents : [];
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    console.warn(`Aviso: no se pudo leer el corpus anterior (${error.message}). Se regenera completo.`);
    return [];
  }
}

async function main() {
  const fetched = [];
  const errors = [];

  for (const source of HTML_SOURCES) {
    process.stdout.write(`· HTML ${source.id} ... `);
    try {
      const doc = await ingestHtml(source);
      fetched.push(doc);
      console.log(`${doc.content.length} chars${doc.truncated ? " (truncado)" : ""}`);
    } catch (error) {
      console.log(`ERROR: ${error.message}`);
      errors.push({ id: source.id, error: error.message });
    }
  }

  for (const source of PDF_SOURCES) {
    process.stdout.write(`· PDF  ${source.id} ... `);
    try {
      const doc = await ingestPdf(source);
      fetched.push(doc);
      console.log(`${doc.content.length} chars, ${doc.pages} págs${doc.truncated ? " (truncado)" : ""}`);
    } catch (error) {
      console.log(`ERROR: ${error.message}`);
      errors.push({ id: source.id, error: error.message });
    }
  }

  const previous = await readPreviousCorpus();
  const sources = [...HTML_SOURCES, ...PDF_SOURCES];
  const merged = mergeCorpus({ sources, previous, fetched, errors });
  const { documents, stale, missing } = merged;

  const available = documents.filter((doc) => doc.status === "official").length;
  if (available < 5) {
    throw new Error(
      `Solo hay ${available} fuentes oficiales disponibles; se aborta para no publicar un corpus vacío.`,
    );
  }

  await mkdir(dirname(OUT_TS), { recursive: true });
  await writeFile(OUT_TS, toTs(documents), "utf8");
  await writeFile(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: documents.length,
        official: available,
        stale,
        missing,
        errors,
        documents,
      },
      null,
      2,
    ),
    "utf8",
  );

  const total = documents.reduce((sum, d) => sum + d.content.length, 0);
  console.log(`\n✓ ${documents.length} fuentes (${available} vigentes, ${stale.length} obsoletas), ${total.toLocaleString("es-ES")} caracteres.`);
  console.log(`  ${OUT_TS}`);
  if (errors.length) console.log(`  ${errors.length} fuentes fallidas (ver JSON).`);
  if (stale.length) console.log(`  Conservadas como stale: ${stale.join(", ")}`);
  if (missing.length) console.log(`  Sin copia previa: ${missing.join(", ")}`);
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entry) {
  main().catch((error) => {
    console.error(`\n✗ Ingesta abortada: ${error.message}`);
    process.exit(1);
  });
}

