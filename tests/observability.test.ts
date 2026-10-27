import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ERROR_EVENTS,
  createRequestId,
  describeDsn,
  getMemoryErrorEvents,
  headerValue,
  recordErrorEvent,
  requestIdFromHeaders,
  resetMemoryErrorEvents,
  toErrorAuditRow,
} from "../lib/observability/core";
import { getRecentAudit } from "../lib/metrics";

process.env.OBSERVABILITY_SILENT = "1";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test("createRequestId genera un UUID válido", () => {
  assert.match(createRequestId(), UUID);
});

test("requestIdFromHeaders reutiliza el id que pone el proxy", () => {
  const headers = new Headers({ "x-request-id": "req-abc-123" });
  assert.equal(requestIdFromHeaders(headers), "req-abc-123");
});

test("requestIdFromHeaders ignora ids vacíos o desmedidos", () => {
  assert.match(requestIdFromHeaders(new Headers({ "x-request-id": "   " })), UUID);
  assert.match(requestIdFromHeaders(new Headers({ "x-request-id": "x".repeat(129) })), UUID);
});

test("headerValue acepta string, array y undefined", () => {
  assert.equal(headerValue("a"), "a");
  assert.equal(headerValue(["b", "c"]), "b");
  assert.equal(headerValue(undefined), undefined);
});

test("recordErrorEvent filtra por organización y separa los anónimos", () => {
  resetMemoryErrorEvents();
  recordErrorEvent({ requestId: "err-a", route: "/api/chat", message: "boom", organizationId: "org-a" });
  recordErrorEvent({ requestId: "err-b", route: "/api/chat", message: "boom", organizationId: "org-b" });
  recordErrorEvent({ requestId: "err-anon", route: "/api/chat", message: "boom" });

  const orgA = getMemoryErrorEvents(10, "org-a");
  assert.equal(orgA.length, 1);
  assert.equal(orgA[0].requestId, "err-a");
  assert.equal(orgA[0].status, 500);

  const anonymous = getMemoryErrorEvents(10, null);
  assert.equal(anonymous.length, 1);
  assert.equal(anonymous[0].requestId, "err-anon");
});

test("el buffer de errores respeta el máximo", () => {
  resetMemoryErrorEvents();
  for (let i = 0; i < MAX_ERROR_EVENTS + 10; i++) {
    recordErrorEvent({ requestId: `err-${i}`, route: "/api/chat", message: "boom" });
  }
  assert.equal(getMemoryErrorEvents(MAX_ERROR_EVENTS + 50, null).length, MAX_ERROR_EVENTS);
});

test("createRequestId no repite ids", () => {
  const ids = new Set(Array.from({ length: 50 }, () => createRequestId()));
  assert.equal(ids.size, 50);
});

test("toErrorAuditRow conserva requestId, organización y estado", () => {
  const event = recordErrorEvent({
    requestId: "11111111-2222-3333-4444-555555555555",
    route: "/api/chat",
    message: "boom",
    organizationId: "org-a",
    method: "POST",
    status: 502,
    digest: "abc",
  });
  const row = toErrorAuditRow(event);
  assert.equal(row.action, "error.http");
  assert.equal(row.target_type, "request");
  assert.equal(row.target_id, event.requestId);
  assert.equal(row.organization_id, "org-a");
  assert.equal(row.metadata.request_id, event.requestId);
  assert.equal(row.metadata.status, 502);
  assert.equal(row.metadata.digest, "abc");
  assert.equal(row.metadata.method, "POST");
});

test("getRecentAudit incluye los errores del proceso sin Supabase", async () => {
  resetMemoryErrorEvents();
  recordErrorEvent({ requestId: "err-1", route: "/api/chat", message: "boom" });

  const rows = await getRecentAudit(10, null, null);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, "error.http");
  assert.equal(rows[0].target_id, "err-1");
  assert.equal(rows[0].id, "mem-err-1");
});

test("getRecentAudit no mezcla errores entre organizaciones", async () => {
  resetMemoryErrorEvents();
  recordErrorEvent({ requestId: "err-org-a", route: "/api/chat", message: "boom", organizationId: "org-a" });
  recordErrorEvent({ requestId: "err-anon", route: "/api/chat", message: "boom" });

  const rows = await getRecentAudit(10, "org-a", null);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].target_id, "err-org-a");
});

test("describeDsn extrae origen, proyecto y clave", () => {
  assert.deepEqual(describeDsn("https://abc123@o4507.ingest.sentry.io/450655"), {
    origin: "https://o4507.ingest.sentry.io",
    projectId: "450655",
    key: "abc123",
  });
});

test("describeDsn rechaza DSN inválidos", () => {
  assert.equal(describeDsn(undefined), null);
  assert.equal(describeDsn(""), null);
  assert.equal(describeDsn("no-es-una-url"), null);
  assert.equal(describeDsn("https://o4507.ingest.sentry.io/450655"), null);
  assert.equal(describeDsn("https://abc123@o4507.ingest.sentry.io/"), null);
});
