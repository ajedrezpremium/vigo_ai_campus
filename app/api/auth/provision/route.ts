import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { provisionMembership } from "@/lib/auth";


export async function POST() {
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
    return NextResponse.json({ error: "No se pudo preparar la cuenta", reason: result.reason }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    role: result.role,
    organizationId: result.organizationId,
    organizationName: "organizationName" in result ? result.organizationName : undefined,
  });
}


