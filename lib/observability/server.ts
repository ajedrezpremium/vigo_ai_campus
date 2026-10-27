import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  logEvent,
  recordErrorEvent,
  toErrorAuditRow,
  type ErrorEvent,
  type ErrorEventInput,
} from "./core";

/**
 * Registra un error de servidor (log + memoria + Sentry) y lo persiste en
 * `audit_events` para que aparezca en el panel con su `requestId`.
 * La persistencia es best-effort: nunca debe tapar el error original.
 */
export async function reportServerError(input: ErrorEventInput): Promise<ErrorEvent> {
  const event = recordErrorEvent(input);
  const admin = getSupabaseAdminClient();
  if (!admin) return event;

  const { error } = await admin.from("audit_events").insert(toErrorAuditRow(event));
  if (error) {
    logEvent("warn", "observability.persist_failed", {
      requestId: event.requestId,
      error: error.message,
    });
  }
  return event;
}

/** Respuesta 5xx homogénea: cuerpo con `requestId` y cabecera correlacionable. */
export function errorResponse(
  requestId: string,
  body: { error: string; code?: string },
  status = 500,
) {
  return NextResponse.json(
    { ...body, requestId },
    { status, headers: { "X-Request-Id": requestId } },
  );
}
