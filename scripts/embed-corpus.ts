import "./load-env";

import { getEmbeddingsConfig, embedTexts, estimateEmbeddingTokens, toVectorLiteral } from "@/lib/embeddings";
import { listCorpusChunks, type CorpusChunk } from "@/lib/retrieval";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

function flag(name: string) {
  return process.argv.includes(name);
}

function numberFlag(prefix: string) {
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return null;
  const value = Number(raw.slice(prefix.length));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

async function pickOrganization(admin: AdminClient) {
  const configured = process.env.EMBEDDINGS_ORG_ID;
  if (configured) return configured;

  const { data, error } = await admin
    .from("organizations")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    throw new Error("No hay organizaciones en Supabase. Crea una o define EMBEDDINGS_ORG_ID.");
  }
  return data.id as string;
}

function groupDocuments(chunks: CorpusChunk[]) {
  const docs = new Map<string, CorpusChunk>();
  for (const chunk of chunks) {
    if (!docs.has(chunk.documentId)) docs.set(chunk.documentId, chunk);
  }
  return [...docs.values()];
}

async function main() {
  const config = getEmbeddingsConfig();
  const limit = numberFlag("--limit=");
  const dryRun = flag("--dry-run");
  const allChunks = listCorpusChunks();
  const chunks = limit ? allChunks.slice(0, limit) : allChunks;
  const documents = groupDocuments(chunks);
  const texts = chunks.map((chunk) => `${chunk.title}\n\n${chunk.text}`);
  const estimatedTokens = estimateEmbeddingTokens(texts);

  console.log(`Modelo:        ${config.model} (${config.dimensions} dims)`);
  console.log(`Documentos:    ${documents.length}`);
  console.log(`Fragmentos:    ${chunks.length}`);
  console.log(`Tokens est.:   ${estimatedTokens.toLocaleString("es-ES")}`);
  console.log(`Coste est.:    ${(estimatedTokens * 0.00000002).toFixed(6)} $ (a 0,02 $/M tokens)`);

  if (!config.enabled || !config.apiKey) {
    throw new Error("Falta LLM_API_KEY o EMBEDDINGS_API_KEY para generar embeddings.");
  }

  if (dryRun) {
    console.log("\n--dry-run: no se llama a la API ni se escribe en Supabase.");
    return;
  }

  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");

  const organizationId = await pickOrganization(admin);
  console.log(`Organización:  ${organizationId}`);

  console.log("\nGenerando embeddings...");
  const started = Date.now();
  const { vectors, tokens, costUsd } = await embedTexts(texts, {
    onProgress: (done, total) => console.log(`  ${done}/${total}`),
  });
  console.log(`Embeddings generados en ${((Date.now() - started) / 1000).toFixed(1)} s`);

  const existing = await admin
    .from("documents")
    .select("id, version_label")
    .eq("organization_id", organizationId)
    .in(
      "version_label",
      documents.map((doc) => doc.documentId),
    );

  if (existing.error) throw new Error(`No se pudieron leer los documentos: ${existing.error.message}`);

  const documentIds = new Map<string, string>();
  for (const row of existing.data ?? []) {
    if (row.version_label) documentIds.set(String(row.version_label), String(row.id));
  }

  for (const doc of documents) {
    const known = documentIds.get(doc.documentId);
    if (known) {
      const { error } = await admin
        .from("documents")
        .update({ title: doc.title, status: "indexed" })
        .eq("id", known);
      if (error) throw new Error(`No se pudo actualizar ${doc.documentId}: ${error.message}`);
      continue;
    }

    const { data, error } = await admin
      .from("documents")
      .insert({
        organization_id: organizationId,
        source_id: null,
        title: doc.title,
        version_label: doc.documentId,
        status: "indexed",
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`No se pudo crear ${doc.documentId}: ${error?.message ?? "sin datos"}`);
    documentIds.set(doc.documentId, String(data.id));
  }

  const ids = [...documentIds.values()];
  const removed = await admin.from("document_chunks").delete().in("document_id", ids);
  if (removed.error) throw new Error(`No se pudieron limpiar los fragmentos: ${removed.error.message}`);

  const rows = chunks.map((chunk, index) => {
    const vector = vectors[index];
    if (!vector) throw new Error(`Falta el vector del fragmento ${chunk.id}`);
    return {
      organization_id: organizationId,
      document_id: documentIds.get(chunk.documentId),
      chunk_index: chunk.chunkIndex,
      content: chunk.text,
      metadata: {
        corpusId: chunk.documentId,
        title: chunk.title,
        sourceUrl: chunk.sourceUrl,
        locale: chunk.locale,
        organization: chunk.organization,
        kind: chunk.kind,
        reviewedAt: chunk.reviewedAt,
        truncated: chunk.truncated,
        sourceType: chunk.sourceType,
        status: chunk.status,
        documentIntro: chunk.documentIntro,
      },
      embedding: toVectorLiteral(vector),
    };
  });

  for (let offset = 0; offset < rows.length; offset += 20) {
    const batch = rows.slice(offset, offset + 20);
    const { error } = await admin.from("document_chunks").insert(batch);
    if (error) throw new Error(`No se pudieron insertar los fragmentos: ${error.message}`);
    console.log(`  insertados ${Math.min(offset + batch.length, rows.length)}/${rows.length}`);
  }

  console.log("\nResumen");
  console.log(`  Documentos: ${documents.length} (${documentIds.size} en Supabase)`);
  console.log(`  Fragmentos:  ${rows.length}`);
  console.log(`  Tokens:      ${tokens.toLocaleString("es-ES")}`);
  console.log(`  Coste real:  ${costUsd.toFixed(6)} $`);
  console.log(`  Duración:    ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

main().catch((error) => {
  console.error(`\nError: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
