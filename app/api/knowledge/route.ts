import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getFeedbackSummary } from "@/lib/feedback";
import { getCorpusStats, listCorpusDocuments } from "@/lib/retrieval";


export async function GET() {
  const viewer = await getViewer();
  if (!can(viewer.role, "knowledge.read")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return NextResponse.json(
    { stats: getCorpusStats(), documents: listCorpusDocuments(), feedback: await getFeedbackSummary(viewer.organizationId) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

