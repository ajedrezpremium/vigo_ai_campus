import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getLLMStatus } from "@/lib/llm";


export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!can(viewer.role, "metrics.read")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const status = await getLLMStatus(force);
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}


