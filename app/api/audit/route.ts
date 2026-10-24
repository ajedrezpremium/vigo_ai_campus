import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getRecentAudit } from "@/lib/metrics";


export async function GET() {
  const viewer = await getViewer();
  if (!can(viewer.role, "audit.read")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const events = await getRecentAudit(40);
  return NextResponse.json({ events, source: events.length ? "supabase" : "empty" }, { headers: { "Cache-Control": "no-store" } });
}


