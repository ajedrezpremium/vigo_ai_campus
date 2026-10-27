/**
 * Observabilidad sin dependencias: request ids, logs estructurados en JSON,
 * buffer en memoria para el panel y reenvío opcional a Sentry.
 *
 * Este módulo no importa Supabase a propósito: `instrumentation.ts` también
 * se compila para el runtime edge y debe seguir siendo ligero.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type ErrorEventInput = {
  requestId: string;
  route: string;
  message: string;
  status?: number;
  digest?: string;
  method?: string;
  organizationId?: string | null;
  source?: ErrorEventSource;
};

export type ErrorEventSource = "route" | "instrumentation" | "server";

export type ErrorEvent = {
  requestId: string;
  route: string;
  message: string;
  status: number;
  digest?: string;
  method?: string;
  organizationId: string | null;
  source: ErrorEventSource;
  at: string;
};

export const REQUEST_ID_HEADER = "x-request-id";
export const MAX_ERROR_EVENTS = 200;

const globalStore = globalThis as typeof globalThis & { __vigoErrorEvents?: ErrorEvent[] };
const memory = (globalStore.__vigoErrorEvents ??= []);

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function headerValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/** Reutiliza el id que haya puesto el proxy; si no existe, genera uno. */
export function requestIdFromHeaders(headers: Headers): string {
  const existing = headers.get(REQUEST_ID_HEADER)?.trim();
  return existing && existing.length > 0 && existing.length <= 128 ? existing : createRequestId();
}

export function logEvent(level: LogLevel, event: string, fields: Record<string, unknown> = {}) {
  if (process.env.OBSERVABILITY_SILENT === "1") return;
  const entry = { ts: new Date().toISOString(), level, event, ...fields };
  let line: string;
  try {
    line = JSON.stringify(entry);
  } catch {
    line = JSON.stringify({ ts: entry.ts, level, event, serialization: "failed" });
  }
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * Guarda el error en el buffer del proceso, lo escribe como log JSON y lo
 * reenvía a Sentry si hay `SENTRY_DSN`. La persistencia en Supabase vive en
 * `server.ts` para no arrastrar el cliente admin al runtime edge.
 */
export function recordErrorEvent(input: ErrorEventInput): ErrorEvent {
  const event: ErrorEvent = {
    requestId: input.requestId,
    route: input.route,
    message: input.message.slice(0, 500),
    status: input.status ?? 500,
    digest: input.digest,
    method: input.method,
    organizationId: input.organizationId ?? null,
    source: input.source ?? "route",
    at: new Date().toISOString(),
  };

  memory.unshift(event);
  if (memory.length > MAX_ERROR_EVENTS) memory.length = MAX_ERROR_EVENTS;

  logEvent("error", "http.error", { ...event });
  void forwardToSentry(event);

  return event;
}

/**
 * Errores del proceso actual. Con organización se filtra por tenant; sin
 * organización solo se devuelven los eventos también sin organización, para
 * no mezclar datos entre inquilinos.
 */
export function getMemoryErrorEvents(limit = 40, organizationId: string | null = null): ErrorEvent[] {
  return memory
    .filter((event) =>
      organizationId ? event.organizationId === organizationId : event.organizationId === null,
    )
    .slice(0, limit);
}

export function resetMemoryErrorEvents() {
  memory.length = 0;
}

/** Fila compatible con `audit_events` para poder verla en el panel admin. */
export function toErrorAuditRow(event: ErrorEvent) {
  return {
    organization_id: event.organizationId,
    action: "error.http" as const,
    target_type: "request" as const,
    target_id: event.requestId,
    metadata: {
      request_id: event.requestId,
      route: event.route,
      method: event.method ?? null,
      status: event.status,
      message: event.message,
      digest: event.digest ?? null,
      source: event.source,
    },
  };
}

export type SentryDsn = { origin: string; projectId: string; key: string };

/** Extrae origen, proyecto y clave pública de un DSN de Sentry. */
export function describeDsn(dsn: string | null | undefined): SentryDsn | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+/, "");
    if (!url.username || !projectId) return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return { origin: url.origin, projectId, key: url.username };
  } catch {
    return null;
  }
}

function sentryEventId(requestId: string): string {
  const hex = requestId.replace(/[^a-f0-9]/gi, "").toLowerCase();
  return hex.padEnd(32, "0").slice(0, 32);
}

/**
 * Reenvío directo al endpoint de ingesta de Sentry (sin SDK). Best-effort:
 * nunca lanza ni bloquea la respuesta.
 */
export async function forwardToSentry(event: ErrorEvent): Promise<boolean> {
  const dsn = describeDsn(process.env.SENTRY_DSN);
  if (!dsn) return false;

  const payload = {
    event_id: sentryEventId(event.requestId),
    timestamp: event.at,
    platform: "javascript",
    level: "error",
    logger: "vigo-ai-campus",
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    message: event.message,
    tags: {
      route: event.route,
      request_id: event.requestId,
      source: event.source,
    },
    extra: {
      status: event.status,
      digest: event.digest ?? null,
      method: event.method ?? null,
      organization_id: event.organizationId,
    },
  };

  try {
    const response = await fetch(`${dsn.origin}/api/${dsn.projectId}/store/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=vigo-ai-campus/0.1, sentry_key=${dsn.key}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) {
      logEvent("warn", "sentry.forward_failed", { requestId: event.requestId, status: response.status });
      return false;
    }
    return true;
  } catch (error) {
    logEvent("warn", "sentry.forward_failed", {
      requestId: event.requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}
