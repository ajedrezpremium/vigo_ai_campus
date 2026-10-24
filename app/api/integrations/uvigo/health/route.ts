import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getIntegrationHealth } from "@/lib/uvigo/client";


export async function GET() {
  const viewer = await getViewer();
  if (!can(viewer.role, "integrations.manage")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const integrations = getIntegrationHealth();
  return NextResponse.json(
    {
      integrations,
      configured: integrations.filter((i) => i.configured).length,
      total: integrations.length,
      note: "Los endpoints reales requieren convenio y credenciales de la Universidade de Vigo.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

