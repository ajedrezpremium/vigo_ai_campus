import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyHmacSignature } from "@/lib/security";


type UvigoEvent = {
  type?: string;
  id?: string;
  payload?: Record<string, unknown>;
};

export async function POST(req: Request) {
  const secret = process.env.UVIGO_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-uvigo-signature") ?? req.headers.get("x-signature");
  if (!verifyHmacSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let event: UvigoEvent;
  try {
    event = JSON.parse(raw) as UvigoEvent;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    await admin.from("audit_events").insert({
      action: `uvigo.webhook.${event.type ?? "unknown"}`,
      target_type: "integration",
      target_id: event.id ?? null,
      metadata: { payload: event.payload ?? {}, received_at: new Date().toISOString() },
    });
  }

  return NextResponse.json({ ok: true, type: event.type ?? "unknown" });
}


