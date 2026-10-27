import assert from "node:assert/strict";
import { test } from "node:test";
import { EVAL_QUESTIONS, answerFaithfulness, runEvaluation } from "../lib/evaluation";
import { detectOutOfScope, evidenceCoverage, shouldAbstain } from "../lib/evidence";
import { composeGroundedAnswer } from "../lib/answer-composer";
import { retrieve } from "../lib/retrieval";

test("el set de evaluación tiene 30 preguntas únicas y equilibradas", () => {
  assert.ok(EVAL_QUESTIONS.length >= 30);
  assert.equal(new Set(EVAL_QUESTIONS.map((q) => q.id)).size, EVAL_QUESTIONS.length);

  const answerable = EVAL_QUESTIONS.filter((q) => q.expectation === "answer");
  const abstain = EVAL_QUESTIONS.filter((q) => q.expectation === "abstain");
  assert.ok(answerable.length >= 20);
  assert.ok(abstain.length >= 8);
  assert.ok(answerable.every((q) => q.documents.length > 0));
  assert.ok(abstain.every((q) => q.documents.length === 0));
});

test("detecta consultas fuera de alcance y datos personales", () => {
  assert.equal(detectOutOfScope("¿Cómo solicito una beca en la Universidad de Santiago?"), "other_university");
  assert.equal(detectOutOfScope("¿Qué notas saqué en Física?"), "personal_data");
  assert.equal(detectOutOfScope("¿Puedes reservar una cita médica en el SERGAS?"), "out_of_domain");
  assert.equal(detectOutOfScope("¿Cómo me matriculo en un grado?"), null);
});

test("la cobertura de evidencia distingue preguntas respondibles", () => {
  const answerable = retrieve("¿Cómo me matriculo en un grado?", { topK: 5, includeDemo: false });
  assert.ok(evidenceCoverage("¿Cómo me matriculo en un grado?", answerable) >= 0.6);
  assert.equal(shouldAbstain("¿Cómo me matriculo en un grado?", answerable), false);

  const offTopic = retrieve("¿Cuánto cuesta el menú del comedor del campus de Ourense?", {
    topK: 5,
    includeDemo: false,
  });
  assert.equal(shouldAbstain("¿Cuánto cuesta el menú del comedor del campus de Ourense?", offTopic), true);
});

test("el compositor extractivo se mantiene fiel al contexto", () => {
  const query = "¿Cómo me matriculo en un grado?";
  const chunks = retrieve(query, { topK: 5, includeDemo: false });
  const composed = composeGroundedAnswer({
    query,
    chunks,
    agent: "student-agent",
    locale: "es",
    reason: "quota",
  });
  assert.equal(answerFaithfulness(composed.answer, chunks), 1);
});

test("la evaluación offline cumple los umbrales de la fase 3", async () => {
  const report = await runEvaluation();
  assert.equal(report.summary.mode, "composer");
  assert.equal(report.summary.questions, EVAL_QUESTIONS.length);
  assert.ok(report.summary.retrievalRecall >= 0.85, `recall ${report.summary.retrievalRecall}`);
  assert.ok(report.summary.answerCoverage >= 0.85, `coverage ${report.summary.answerCoverage}`);
  assert.ok(report.summary.abstentionAccuracy >= 0.9, `abstención ${report.summary.abstentionAccuracy}`);
  assert.equal(report.summary.citationValidity, 1);
  assert.ok(report.summary.faithfulness >= 0.9, `faithfulness ${report.summary.faithfulness}`);
  assert.ok(report.summary.latencyP95Ms <= report.summary.thresholds.latencyP95Ms);
  assert.equal(report.summary.passed, true);
});
