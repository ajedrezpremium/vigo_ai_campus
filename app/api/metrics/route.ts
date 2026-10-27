import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getMetricsSummary } from "@/lib/metrics";


export async function GET() {
  const viewer = await getViewer();
  if (!can(viewer.role, "metrics.read")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const summary = await getMetricsSummary(7, viewer.organizationId);
  return NextResponse.json(
    {
      ...summary,
      viewer: {
        role: viewer.role,
        organization: viewer.organizationName,
        mode: viewer.mode,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}


