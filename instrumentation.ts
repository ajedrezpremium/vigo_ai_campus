import type { Instrumentation } from "next";
import {
  REQUEST_ID_HEADER,
  createRequestId,
  headerValue,
} from "@/lib/observability/core";
import { reportServerError } from "@/lib/observability/server";

/**
 * Hook de Next para errores no capturados (rutas, RSC y Server Actions).
 * Añade un `requestId` correlacionable con los logs y con el panel de
 * auditoría, y lo reenvía a Sentry si `SENTRY_DSN` está definido.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const requestId = headerValue(request.headers[REQUEST_ID_HEADER]) ?? createRequestId();
  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest?: unknown }).digest)
      : undefined;

  await reportServerError({
    requestId,
    route: `${context.routePath} (${context.routeType})`,
    method: request.method,
    message,
    digest,
    organizationId: null,
    source: "instrumentation",
  });
};
