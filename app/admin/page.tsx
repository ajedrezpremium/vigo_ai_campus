export const instant = false;

import { connection } from "next/server";
import Link from "next/link";
import { Activity, BookOpenCheck, Bot, Ticket } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { getMetricsSummary } from "@/lib/metrics";
import { getCorpusStats } from "@/lib/retrieval";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminHome() {
  await connection();
  const [viewer, metrics] = await Promise.all([getViewer(), getMetricsSummary(7)]);
  const corpus = getCorpusStats();

  const cards = [
    { href: "/admin/analytics", label: "Consultas (7 dÃ­as)", value: metrics.totals.requests, icon: Activity, hint: `${metrics.totals.resolvedRate}% resueltas` },
    { href: "/admin/tickets", label: "Tickets abiertos", value: metrics.totals.ticketsOpen, icon: Ticket, hint: `${metrics.totals.ticketsTotal} totales` },
    { href: "/admin/knowledge", label: "Fuentes oficiales", value: corpus.officialDocuments, icon: BookOpenCheck, hint: `${corpus.pdfDocuments} PDFs` },
    { href: "/admin/ai", label: "Estado IA", value: "OpenRouter", icon: Bot, hint: "cuota y modelos" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Resumen de administraciÃ³n</h1>
        <p className="mt-1 text-sm text-slate-500">
          {viewer.organizationName ?? "VIGO AI CAMPUS"} Â· rol {viewer.role} Â· datos de los Ãºltimos 7 dÃ­as.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group">
            <Card className="h-full border-slate-200 bg-white/90 transition group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{card.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
                  </div>
                  <card.icon className="h-5 w-5 text-cyan-600" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white/90">
          <CardHeader><CardTitle className="text-base">Salud del sistema</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-500">Persistencia</span><Badge variant="secondary" className="bg-emerald-50 text-emerald-700">{metrics.source === "supabase" ? "Supabase" : "Memoria"}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Latencia p95</span><span className="font-semibold">{metrics.latency.p95} ms</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Tasa de derivaciÃ³n</span><span className="font-semibold">{metrics.totals.escalationRate}%</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Ãšltima captura del corpus</span><span className="font-semibold">{corpus.lastCapture ?? "â€”"}</span></div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/90">
          <CardHeader><CardTitle className="text-base">Accesos rÃ¡pidos</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {[
              ["/admin/analytics", "Ver mÃ©tricas"],
              ["/admin/tickets", "Gestionar derivaciones"],
              ["/admin/knowledge", "Revisar fuentes"],
              ["/admin/audit", "AuditorÃ­a"],
              ["/admin/ai", "DiagnÃ³stico IA"],
              ["/admin/members", "Miembros y roles"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-cyan-300 hover:bg-cyan-50">
                {label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

