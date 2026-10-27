import "./load-env";

import { getEmbeddingsConfig, isEmbeddingsConfigured } from "@/lib/embeddings";
import { getSemanticBackendStatus } from "@/lib/semantic";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function main() {
  const config = getEmbeddingsConfig();
  const admin = getSupabaseAdminClient();
  const key = config.apiKey;

  console.log("Configuración de búsqueda semántica");
  console.log(`  Modelo:      ${config.model}`);
  console.log(`  Dimensiones: ${config.dimensions}`);
  console.log(`  Endpoint:    ${config.endpoint}`);
  console.log(`  Clave:       ${key ? `${key.slice(0, 6)}…${key.slice(-4)}` : "no configurada"}`);
  console.log(`  Supabase:    ${admin ? "configurado" : "no configurado"}`);

  if (!isEmbeddingsConfigured() || !admin) {
    console.log("\nSin embeddings o sin Supabase: el chat usa solo BM25 (léxico).");
    return;
  }

  const status = await getSemanticBackendStatus();
  console.log("\nEstado");
  console.log(`  Backend:     ${status.backend === "rpc" ? "pgvector (match_document_chunks)" : "memoria (falta la migración)"}`);
  console.log(`  Fragmentos:  ${status.chunks ?? "desconocido"}`);

  const docs = await admin
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("status", "indexed");
  console.log(`  Documentos:  ${docs.count ?? "desconocido"}`);

  if (status.rpcError) {
    console.log(`  Error RPC:   ${status.rpcError}`);
  }

  if (status.backend !== "rpc") {
    console.log(
      "\nAcción: aplica supabase/migrations/0003_semantic_search.sql en el SQL Editor de Supabase\n" +
        "(o con `supabase db push`) para activar pgvector + HNSW. Mientras tanto la búsqueda\n" +
        "semántica funciona en memoria, suficiente para validar la calidad con el corpus actual.",
    );
  }

  if ((status.chunks ?? 0) === 0) {
    console.log("\nAcción: ejecuta `npm run embed:corpus` para indexar el corpus.");
  }
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
