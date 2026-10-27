import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type FeedbackEvent = {
  requestId: string;
  rating: number;
  comment?: string;
  agent?: string;
  conversationId?: string | null;
  organizationId?: string | null;
  userId?: string | null;
  createdAt: string;
};

export type FeedbackSummary = {
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
  byAgent: { agent: string; total: number; negative: number }[];
  needsReview: FeedbackEvent[];
};

const globalStore = globalThis as typeof globalThis & { __vigoFeedback?: FeedbackEvent[] };
const memory = (globalStore.__vigoFeedback ??= []);

/**
 * Registra una valoración del chat. Se guarda siempre en memoria (modo demo y
 * panel local) y, si hay service role, también en `audit_events` como
 * `chat.feedback` para que sobreviva a reinicios y se pueda filtrar por tenant.
 *
 * No se escribe en `feedback` aquí: esa tabla exige un `message_id` real. La
 * ruta intenta persistirlo cuando el usuario está autenticado y el chat se
 * guardó en Supabase.
 */
export async function recordFeedback(input: {
  requestId: string;
  rating: number;
  comment?: string;
  agent?: string;
  conversationId?: string | null;
  organizationId?: string | null;
  userId?: string | null;
}): Promise<boolean> {
  const event: FeedbackEvent = {
    requestId: input.requestId,
    rating: input.rating,
    ...(input.comment ? { comment: input.comment.slice(0, 500) } : {}),
    ...(input.agent ? { agent: input.agent } : {}),
    conversationId: input.conversationId ?? null,
    organizationId: input.organizationId ?? null,
    userId: input.userId ?? null,
    createdAt: new Date().toISOString(),
  };

  // Se reemplaza la valoración previa del mismo request para no contar dobles.
  const existing = memory.findIndex((item) => item.requestId === event.requestId);
  if (existing >= 0) memory.splice(existing, 1);
  memory.unshift(event);
  if (memory.length > 1000) memory.length = 1000;

  const admin = getSupabaseAdminClient();
  if (!admin) return false;

  const { error } = await admin.from("audit_events").insert({
    organization_id: event.organizationId,
    actor_user_id: event.userId,
    action: "chat.feedback",
    target_type: "request",
    target_id: event.requestId,
    metadata: {
      rating: event.rating,
      comment: event.comment ?? null,
      agent: event.agent ?? null,
      conversation_id: event.conversationId ?? null,
    },
  });

  if (error) {
    console.warn("[feedback] no se pudo persistir:", error.message);
    return false;
  }

  return true;
}

/** Agregación pura, usada por el panel y por los tests. */
export function summarizeFeedback(events: FeedbackEvent[], limit = 5): FeedbackSummary {
  const total = events.length;
  const positive = events.filter((event) => event.rating >= 4).length;
  const negative = events.filter((event) => event.rating <= 2).length;

  const agentMap = new Map<string, { total: number; negative: number }>();
  for (const event of events) {
    const agent = event.agent ?? "sin-agente";
    const entry = agentMap.get(agent) ?? { total: 0, negative: 0 };
    entry.total += 1;
    entry.negative += event.rating <= 2 ? 1 : 0;
    agentMap.set(agent, entry);
  }

  return {
    total,
    positive,
    negative,
    positiveRate: total ? Math.round((positive / total) * 1000) / 10 : 0,
    byAgent: [...agentMap.entries()]
      .map(([agent, value]) => ({ agent, ...value }))
      .sort((a, b) => b.total - a.total),
    needsReview: events
      .filter((event) => event.rating <= 2)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit),
  };
}

/**
 * Valoraciones recientes para el panel. Sin organización se usa solo la
 * memoria del proceso (modo demo), igual que el resto de métricas.
 */
export async function getFeedbackSummary(
  organizationId?: string | null,
  client: ReturnType<typeof getSupabaseAdminClient> = getSupabaseAdminClient(),
): Promise<FeedbackSummary> {
  const admin = client;
  const tenant = organizationId ?? null;
  const local = memory.filter((event) =>
    tenant ? event.organizationId === tenant : event.organizationId === null,
  );

  if (!admin || !tenant) return summarizeFeedback(local);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("audit_events")
    .select("created_at, target_id, metadata")
    .eq("organization_id", tenant)
    .eq("action", "chat.feedback")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data?.length) return summarizeFeedback(local);

  const persisted: FeedbackEvent[] = data.map((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return {
      requestId: String(row.target_id ?? ""),
      rating: typeof meta.rating === "number" ? meta.rating : 0,
      ...(typeof meta.comment === "string" && meta.comment ? { comment: meta.comment } : {}),
      ...(typeof meta.agent === "string" && meta.agent ? { agent: meta.agent } : {}),
      conversationId: typeof meta.conversation_id === "string" ? meta.conversation_id : null,
      organizationId: tenant,
      createdAt: String(row.created_at),
    };
  });

  const seen = new Set(persisted.map((event) => event.requestId));
  return summarizeFeedback([...persisted, ...local.filter((event) => !seen.has(event.requestId))]);
}

export function resetFeedbackStore() {
  memory.length = 0;
}
