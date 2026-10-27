import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMemoryErrorEvents, toErrorAuditRow } from "@/lib/observability/core";

export type MetricEvent = {
  id: string;
  timestamp: string;
  agent: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  resolved: boolean;
  escalated: boolean;
  citationCount: number;
  officialCitationCount: number;
  locale: string;
  organizationId?: string | null;
  blocked?: boolean;
};

export type AuditInsertRow = {
  organization_id: string | null;
  action: "chat.completed";
  target_type: "conversation";
  target_id: string;
  metadata: Record<string, unknown>;
};

type AuditRow = {
  created_at: string;
  action: string;
  metadata: Record<string, unknown> | null;
};

const globalStore = globalThis as typeof globalThis & { __vigoMetrics?: MetricEvent[] };
const memory = (globalStore.__vigoMetrics ??= []);

/** Fila de auditoría asociada a una métrica. El tenant es obligatorio al persistir. */
export function toAuditRow(event: MetricEvent): AuditInsertRow {
  return {
    organization_id: event.organizationId ?? null,
    action: "chat.completed",
    target_type: "conversation",
    target_id: event.id,
    metadata: {
      agent: event.agent,
      model: event.model,
      latency_ms: event.latencyMs,
      input_tokens: event.inputTokens,
      output_tokens: event.outputTokens,
      resolved: event.resolved,
      escalated: event.escalated,
      citation_count: event.citationCount,
      official_citation_count: event.officialCitationCount,
      locale: event.locale,
    },
  };
}

export function recordMetric(event: MetricEvent) {
  memory.unshift(event);
  if (memory.length > 1000) memory.length = 1000;

  const admin = getSupabaseAdminClient();
  if (!admin) return;

  // Persistencia best-effort: una métrica perdida no debe romper el chat.
  void admin
    .from("audit_events")
    .insert(toAuditRow(event))
    .then(({ error }) => {
      if (error) console.warn("[metrics] no se pudo persistir:", error.message);
    });
}

export function recordSecurityEvent(event: {
  reasons: string[];
  path: string;
  identifier: string;
  organizationId?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  void admin
    .from("audit_events")
    .insert({
      organization_id: event.organizationId ?? null,
      action: "security.blocked",
      target_type: "request",
      metadata: { reasons: event.reasons, path: event.path, identifier: event.identifier },
    })
    .then(({ error }) => {
      if (error) console.warn("[audit] no se pudo persistir:", error.message);
    });
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[index]);
}

type SummaryInput = {
  events: MetricEvent[];
  source: "supabase" | "memory";
  ticketsOpen: number;
  ticketsTotal: number;
  conversations: number;
};

function summarize({ events, source, ticketsOpen, ticketsTotal, conversations }: SummaryInput) {
  const total = events.length;
  const latencies = events.map((e) => e.latencyMs);
  const resolved = events.filter((e) => e.resolved).length;
  const escalated = events.filter((e) => e.escalated).length;
  const inputTokens = events.reduce((sum, e) => sum + e.inputTokens, 0);
  const outputTokens = events.reduce((sum, e) => sum + e.outputTokens, 0);

  const agentMap = new Map<string, { requests: number; resolved: number; escalated: number; latency: number[] }>();
  for (const event of events) {
    const entry = agentMap.get(event.agent) ?? { requests: 0, resolved: 0, escalated: 0, latency: [] };
    entry.requests += 1;
    entry.resolved += event.resolved ? 1 : 0;
    entry.escalated += event.escalated ? 1 : 0;
    entry.latency.push(event.latencyMs);
    agentMap.set(event.agent, entry);
  }

  const days: { date: string; requests: number; resolved: number; escalated: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - i);
    const key = date.toISOString().slice(0, 10);
    const dayEvents = events.filter((e) => e.timestamp.slice(0, 10) === key);
    days.push({
      date: key,
      requests: dayEvents.length,
      resolved: dayEvents.filter((e) => e.resolved).length,
      escalated: dayEvents.filter((e) => e.escalated).length,
    });
  }

  return {
    source,
    generatedAt: new Date().toISOString(),
    totals: {
      requests: total,
      resolved,
      escalated,
      resolvedRate: total ? Math.round((resolved / total) * 1000) / 10 : 0,
      escalationRate: total ? Math.round((escalated / total) * 1000) / 10 : 0,
      inputTokens,
      outputTokens,
      conversations,
      ticketsOpen,
      ticketsTotal,
    },
    latency: {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      max: latencies.length ? Math.max(...latencies) : 0,
    },
    byAgent: [...agentMap.entries()]
      .map(([agent, value]) => ({
        agent,
        requests: value.requests,
        resolved: value.resolved,
        escalated: value.escalated,
        p95: percentile(value.latency, 95),
      }))
      .sort((a, b) => b.requests - a.requests),
    days,
    recent: events.slice(0, 12).map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      agent: e.agent,
      latencyMs: e.latencyMs,
      resolved: e.resolved,
      escalated: e.escalated,
      citations: e.citationCount,
    })),
  };
}

export type MetricsSummary = ReturnType<typeof summarize>;

export async function getMetricsSummary(
  days = 7,
  organizationId?: string | null,
  client: ReturnType<typeof getSupabaseAdminClient> = getSupabaseAdminClient(),
): Promise<MetricsSummary> {
  const admin = client;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let events = memory.filter((e) => e.timestamp >= since);
  let source: "supabase" | "memory" = "memory";
  let ticketsOpen = 0;
  let ticketsTotal = 0;
  let conversations = 0;

  // Solo se consulta con service role cuando hay un tenant identificado:
  // sin organización, una consulta global filtraría datos de otros tenants.
  if (admin && organizationId) {
    const { data, error } = await admin
      .from("audit_events")
      .select("created_at, action, metadata")
      .eq("organization_id", organizationId)
      .eq("action", "chat.completed")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!error && data) {
      const rows = data as AuditRow[];
      if (rows.length) {
        source = "supabase";
        events = rows.map((row, i) => {
          const meta = (row.metadata ?? {}) as Record<string, unknown>;
          const num = (key: string) => (typeof meta[key] === "number" ? (meta[key] as number) : 0);
          return {
            id: `${row.created_at}-${i}`,
            timestamp: row.created_at,
            agent: String(meta.agent ?? "campus-orchestrator"),
            model: String(meta.model ?? "unknown"),
            latencyMs: num("latency_ms"),
            inputTokens: num("input_tokens"),
            outputTokens: num("output_tokens"),
            resolved: Boolean(meta.resolved),
            escalated: Boolean(meta.escalated),
            citationCount: num("citation_count"),
            officialCitationCount: num("official_citation_count"),
            locale: String(meta.locale ?? "es"),
          };
        });
      }
    }

    const [{ count: open }, { count: total }, { count: convs }] = await Promise.all([
      admin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["open", "in_progress"]),
      admin.from("tickets").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
      admin.from("conversations").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    ]);
    ticketsOpen = open ?? 0;
    ticketsTotal = total ?? 0;
    conversations = convs ?? 0;
  }

  return summarize({ events, source, ticketsOpen, ticketsTotal, conversations });
}

export async function getRecentAudit(
  limit = 30,
  organizationId?: string | null,
  client: ReturnType<typeof getSupabaseAdminClient> = getSupabaseAdminClient(),
) {
  const admin = client;
  const tenant = organizationId ?? null;

  // Errores 5xx del proceso actual: se muestran aunque no haya Supabase
  // (modo demo) y se deduplican con las filas ya persistidas.
  const memoryRows = getMemoryErrorEvents(limit, tenant).map((event) => {
    const row = toErrorAuditRow(event);
    return {
      id: `mem-${event.requestId}`,
      created_at: event.at,
      action: row.action,
      target_type: row.target_type,
      target_id: row.target_id,
      metadata: row.metadata as Record<string, unknown>,
      organization_id: row.organization_id,
    };
  });

  if (!admin || !tenant) return memoryRows.slice(0, limit);

  const { data, error } = await admin
    .from("audit_events")
    .select("id, created_at, action, target_type, target_id, metadata, organization_id")
    .eq("organization_id", tenant)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return memoryRows.slice(0, limit);

  const seen = new Set(memoryRows.map((row) => row.target_id));
  const persisted = (data ?? []).filter((row) => !seen.has(row.target_id));

  return [...memoryRows, ...persisted]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
}

export function getMemoryMetricCount() {
  return memory.length;
}
