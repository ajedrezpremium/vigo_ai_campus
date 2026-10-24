import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { listCorpusDocuments } from "@/lib/retrieval";


async function check(url: string) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "user-agent": "VigoAICampusBot/1.0 (+cron)" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return { url, ok: res.ok, status: res.status };
  } catch {
    return { url, ok: false, status: 0 };
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const documents = listCorpusDocuments();
  const results: { url: string; ok: boolean; status: number }[] = [];
  const concurrency = 5;

  for (let i = 0; i < documents.length; i += concurrency) {
    const batch = documents.slice(i, i + concurrency);
    results.push(...(await Promise.all(batch.map((doc) => check(doc.sourceUrl)))));
  }

  const failed = results.filter((r) => !r.ok);
  const summary = {
    checkedAt: new Date().toISOString(),
    total: results.length,
    ok: results.length - failed.length,
    failed: failed.length,
    failures: failed.slice(0, 10),
  };

  const admin = getSupabaseAdminClient();
  if (admin) {
    await admin.from("audit_events").insert({
      action: "uvigo.sync",
      target_type: "knowledge_base",
      metadata: summary,
    });
  }

  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}


