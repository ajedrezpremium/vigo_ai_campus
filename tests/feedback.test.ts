import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { getFeedbackSummary, recordFeedback, resetFeedbackStore, summarizeFeedback } from "../lib/feedback";

beforeEach(() => {
  resetFeedbackStore();
});

function event(overrides: Partial<Parameters<typeof summarizeFeedback>[0][number]> = {}) {
  return {
    requestId: "00000000-0000-4000-8000-000000000001",
    rating: 5,
    agent: "student-agent",
    organizationId: null,
    createdAt: "2026-10-27T08:00:00.000Z",
    ...overrides,
  };
}

test("agrega valoraciones positivas, negativas y por agente", () => {
  const summary = summarizeFeedback([
    event({ requestId: "a", rating: 5 }),
    event({ requestId: "b", rating: 4, agent: "admin-agent" }),
    event({ requestId: "c", rating: 2, comment: "No cubre mi caso", createdAt: "2026-10-27T08:00:00.000Z" }),
    event({ requestId: "d", rating: 1, agent: "admin-agent", createdAt: "2026-10-27T09:00:00.000Z" }),
  ]);

  assert.equal(summary.total, 4);
  assert.equal(summary.positive, 2);
  assert.equal(summary.negative, 2);
  assert.equal(summary.positiveRate, 50);
  assert.deepEqual(summary.byAgent, [
    { agent: "student-agent", total: 2, negative: 1 },
    { agent: "admin-agent", total: 2, negative: 1 },
  ]);
  assert.deepEqual(
    summary.needsReview.map((item) => item.requestId),
    ["d", "c"],
  );
});

test("no cuenta dos veces la misma respuesta y conserva la última valoración", async () => {
  await recordFeedback({ requestId: "a", rating: 1, agent: "student-agent" });
  await recordFeedback({ requestId: "a", rating: 5, agent: "student-agent" });

  const summary = await getFeedbackSummary(null, null);
  assert.equal(summary.total, 1);
  assert.equal(summary.negative, 0);
  assert.equal(summary.positive, 1);
});

test("separa las valoraciones por organización", async () => {
  await recordFeedback({ requestId: "a", rating: 2, organizationId: "org-1" });
  await recordFeedback({ requestId: "b", rating: 5, organizationId: "org-2" });

  assert.equal((await getFeedbackSummary("org-1", null)).negative, 1);
  assert.equal((await getFeedbackSummary("org-2", null)).positive, 1);
  assert.equal((await getFeedbackSummary(null, null)).total, 0);
});

test("sin valoraciones devuelve un resumen vacío sin dividir por cero", () => {
  const summary = summarizeFeedback([]);
  assert.equal(summary.total, 0);
  assert.equal(summary.positiveRate, 0);
  assert.deepEqual(summary.needsReview, []);
});
