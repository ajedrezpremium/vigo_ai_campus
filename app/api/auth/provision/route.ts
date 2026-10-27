import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { provisionMembership } from "@/lib/auth";
import { requestIdFromHeaders } from "@/lib/observability/core";
import { errorResponse, reportServerError } from "@/lib/observability/server";


export async function POST(req: Request) {
  const requestId = requestIdFromHeaders(req.headers);
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, mode: "demo", reason: "supabase-not-configured" });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const result = await provisionMembership(user.id, user.email ?? null);
  if (!result.ok) {
    await reportServerError({
      requestId,
      route: "/api/auth/provision",
      method: "POST",
      message: `provision failed: ${result.reason}`,
      organizationId: null,
      source: "route",
    });
    return errorResponse(requestId, {
      error: "No se pudo preparar la cuenta",
      code: "provision_failed",
    });
  }
  return NextResponse.json({
    ok: true,
    role: result.role,
    organizationId: result.organizationId,
    organizationName: "organizationName" in result ? result.organizationName : undefined,
  });
}


