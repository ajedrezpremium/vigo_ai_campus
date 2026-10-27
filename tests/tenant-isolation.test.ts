import assert from "node:assert/strict";
import { test } from "node:test";
import { can } from "../lib/roles";
import { demoRole, resolveProvisionRole } from "../lib/tenant";
import {
  getMetricsSummary,
  getRecentAudit,
  toAuditRow,
  type MetricEvent,
} from "../lib/metrics";

type Call = [string, ...unknown[]];

/**
 * Cliente Supabase falso: registra las llamadas para comprobar que toda
 * consulta con service role lleva el filtro de organización.
 */
function fakeClient(calls: Call[], rows: unknown[] = []): never {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "select", "eq", "gte", "order", "limit", "in"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      // `.limit()` cierra la consulta de métricas; `.in()` cierra los counts.
      if (method === "limit" || method === "in") {
        return Promise.resolve({ data: rows, error: null, count: 0 });
      }
      return chain;
    };
  }
  return chain as never;
}

test("el modo demo nunca concede admin sin DEMO_ADMIN", () => {
  assert.equal(demoRole(false), "estudiante");
  assert.equal(demoRole(true), "admin");
  assert.equal(can(demoRole(false), "metrics.read"), false);
  assert.equal(can(demoRole(false), "admin.access"), false);
  assert.equal(can(demoRole(true), "admin.access"), true);
});

test("un primer usuario no toma la organización en producción sin allowlist", () => {
  const base = { email: "nuevo@uvigo.gal", adminEmails: [], adminCount: 0 };
  assert.equal(resolveProvisionRole({ ...base, isProduction: true }), "user");
  assert.equal(resolveProvisionRole({ ...base, isProduction: false }), "org_admin");
});

test("solo los emails de ADMIN_EMAILS son administradores", () => {
  const adminEmails = ["admin@uvigo.gal"];
  assert.equal(
    resolveProvisionRole({
      email: "ADMIN@uvigo.gal",
      adminEmails,
      adminCount: 3,
      isProduction: true,
    }),
    "org_admin",
  );
  assert.equal(
    resolveProvisionRole({
      email: "estudiante@uvigo.gal",
      adminEmails,
      adminCount: 0,
      isProduction: false,
    }),
    "user",
  );
});

test("las métricas se filtran siempre por organización", async () => {
  const calls: Call[] = [];
  await getMetricsSummary(7, "org-a", fakeClient(calls));

  const orgFilters = calls
    .filter(([method, column]) => method === "eq" && column === "organization_id")
    .map(([, , value]) => value);
  assert.ok(orgFilters.length >= 3, "audit_events, tickets y conversations deben filtrarse");
  assert.ok(orgFilters.every((value) => value === "org-a"));

  const tables = new Set(calls.filter(([method]) => method === "from").map(([, table]) => table));
  assert.deepEqual(
    [...tables].sort(),
    ["audit_events", "conversations", "tickets"],
  );
});

test("sin organización no se consulta con service role", async () => {
  const calls: Call[] = [];
  await getMetricsSummary(7, null, fakeClient(calls));
  assert.equal(calls.length, 0);
});

test("la auditoría exige organización y aplica el filtro", async () => {
  const scoped: Call[] = [];
  const rows = await getRecentAudit(10, "org-a", fakeClient(scoped));
  assert.deepEqual(rows, []);
  assert.ok(
    scoped.some(
      ([method, column, value]) => method === "eq" && column === "organization_id" && value === "org-a",
    ),
  );

  const unscoped: Call[] = [];
  await getRecentAudit(10, null, fakeClient(unscoped));
  assert.equal(unscoped.length, 0);
});

test("la métrica persistida conserva la organización", () => {
  const event: MetricEvent = {
    id: "metric-1",
    timestamp: new Date().toISOString(),
    agent: "student-agent",
    model: "grounded-extractive-v1",
    latencyMs: 120,
    inputTokens: 10,
    outputTokens: 20,
    resolved: true,
    escalated: false,
    citationCount: 2,
    officialCitationCount: 2,
    locale: "es",
    organizationId: "org-a",
  };

  assert.equal(toAuditRow(event).organization_id, "org-a");
  assert.equal(toAuditRow({ ...event, organizationId: undefined }).organization_id, null);
});
