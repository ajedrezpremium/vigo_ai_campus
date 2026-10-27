import "./load-env";

import fs from "node:fs";
import path from "node:path";
import { getEmbeddingsConfig, isEmbeddingsConfigured } from "@/lib/embeddings";
import { PARAPHRASE_QUESTIONS } from "@/lib/evaluation/paraphrases";
import { retrieve } from "@/lib/retrieval";
import { retrieveAsync } from "@/lib/retrieval-hybrid";

type Row = {
  id: string;
  question: string;
  locale: string;
  expected: string[];
  lexical: string[];
  hybrid: string[];
  lexicalRank: number | null;
  hybridRank: number | null;
};

function rankOf(documents: string[], expected: string[]) {
  const index = documents.findIndex((documentId) => expected.includes(documentId));
  return index >= 0 ? index + 1 : null;
}

function summarize(rows: Row[], key: "lexicalRank" | "hybridRank") {
  const total = rows.length;
  const at1 = rows.filter((row) => row[key] === 1).length;
  const at5 = rows.filter((row) => row[key] !== null).length;
  const mrr = rows.reduce((sum, row) => sum + (row[key] ? 1 / row[key]! : 0), 0) / total;
  return {
    recallAt1: Math.round((at1 / total) * 1000) / 1000,
    recallAt5: Math.round((at5 / total) * 1000) / 1000,
    mrr: Math.round(mrr * 1000) / 1000,
  };
}

async function main() {
  if (!isEmbeddingsConfigured()) {
    throw new Error("Configura LLM_API_KEY o EMBEDDINGS_API_KEY para ejecutar la evaluación semántica.");
  }

  const config = getEmbeddingsConfig();
  const rows: Row[] = [];

  for (const item of PARAPHRASE_QUESTIONS) {
    const lexical = retrieve(item.question, { topK: 5, includeDemo: false });
    const hybrid = await retrieveAsync(item.question, { topK: 5, includeDemo: false, semanticThreshold: 0.2 });

    const lexicalDocuments = lexical.map((chunk) => chunk.documentId);
    const hybridDocuments = hybrid.map((chunk) => chunk.documentId);

    rows.push({
      id: item.id,
      question: item.question,
      locale: item.locale,
      expected: item.documents,
      lexical: lexicalDocuments,
      hybrid: hybridDocuments,
      lexicalRank: rankOf(lexicalDocuments, item.documents),
      hybridRank: rankOf(hybridDocuments, item.documents),
    });
  }

  const lexical = summarize(rows, "lexicalRank");
  const hybrid = summarize(rows, "hybridRank");

  console.log(`Modelo: ${config.model} (${config.dimensions} dims)\n`);
  console.log("Pregunta                          Léxico  Híbrido");
  for (const row of rows) {
    const mark = (rank: number | null) => (rank ? `#${rank}` : "fallo").padEnd(8);
    console.log(`${row.id.padEnd(32)} ${mark(row.lexicalRank)}${mark(row.hybridRank)}`);
  }

  console.log("\nMétricas (12 paráfrasis)");
  console.log(`  Léxico  recall@1 ${lexical.recallAt1.toFixed(3)} · recall@5 ${lexical.recallAt5.toFixed(3)} · MRR ${lexical.mrr.toFixed(3)}`);
  console.log(`  Híbrido recall@1 ${hybrid.recallAt1.toFixed(3)} · recall@5 ${hybrid.recallAt5.toFixed(3)} · MRR ${hybrid.mrr.toFixed(3)}`);

  if (!process.argv.includes("--no-write")) {
    const dir = path.join(process.cwd(), "eval", "results");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}-paraphrases.json`);
    fs.writeFileSync(
      file,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          model: config.model,
          dimensions: config.dimensions,
          topK: 5,
          semanticThreshold: 0.2,
          questions: rows.length,
          lexical,
          hybrid,
          items: rows,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`\nInforme: ${path.relative(process.cwd(), file)}`);
  }
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
