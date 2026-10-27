import "./load-env";

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runEvaluation } from "../lib/evaluation";

function arg(name: string) {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function main() {
  const useLLM = process.argv.includes("--llm");
  const useSemantic = process.argv.includes("--semantic");
  const limit = arg("limit") ? Number(arg("limit")) : undefined;
  const out = resolve(arg("out") ?? "eval/results/latest.json");

  const report = await runEvaluation({ useLLM, useSemantic, limit });
  const { summary, items } = report;

  console.log(`\nEvaluación VIGO AI CAMPUS · prompt ${summary.promptVersion} · modo ${summary.mode} · retrieval ${summary.retrieval}${summary.partial ? " · muestra parcial" : ""}`);
  console.log(`Preguntas: ${summary.questions} (${summary.answerable} respondibles, ${summary.unanswerable} de abstención)\n`);
  console.log(`Retrieval recall      ${summary.retrievalRecall.toFixed(3)}  (min ${summary.thresholds.retrievalRecall})`);
  console.log(`Cobertura respuestas  ${summary.answerCoverage.toFixed(3)}  (min ${summary.thresholds.answerCoverage})`);
  console.log(`Abstención correcta   ${summary.abstentionAccuracy.toFixed(3)}  (min ${summary.thresholds.abstentionAccuracy})`);
  console.log(`Citas válidas         ${summary.citationValidity.toFixed(3)}  (min ${summary.thresholds.citationValidity})`);
  console.log(`Cita esperada         ${summary.expectedCitationRate.toFixed(3)}  (min ${summary.thresholds.expectedCitationRate})`);
  console.log(`Faithfulness          ${summary.faithfulness.toFixed(3)}  (min ${summary.thresholds.faithfulness})`);
  console.log(`Solapamiento léxico   ${summary.lexicalGrounding.toFixed(3)}  (diagnóstico)`);
  console.log(
    `Latencia p50/p95/max  ${summary.latencyP50Ms} / ${summary.latencyP95Ms} / ${summary.latencyMaxMs} ms  (p95 máx ${summary.thresholds.latencyP95Ms})`,
  );
  console.log(`\nResultado: ${summary.partial ? "PASA (muestra parcial)" : summary.passed ? "PASA" : "FALLA"}`);

  const problems = items.filter(
    (item) =>
      (item.expectation === "answer" && (item.abstained || !item.retrievalHit || !item.citationsValid)) ||
      (item.expectation === "abstain" && !item.abstained) ||
      (item.faithfulness !== null && item.faithfulness < 0.9),
  );
  if (problems.length) {
    console.log("\nCasos a revisar:");
    for (const item of problems) {
      console.log(
        `- ${item.id}: ${item.expectation}, retrieved=${item.retrievalHit}, abstained=${item.abstained}, ` +
          `citations=${item.citationsValid}, faithfulness=${item.faithfulness}`,
      );
    }
  }

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nInforme guardado en ${out}`);

  if (!summary.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
