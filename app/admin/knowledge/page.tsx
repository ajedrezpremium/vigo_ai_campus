export const instant = false;

import { AlertTriangle, ExternalLink, FileText, MessageSquareWarning, ShieldCheck } from "lucide-react";
import { getCorpusStats, listCorpusDocuments } from "@/lib/retrieval";
import { getViewer } from "@/lib/auth";
import { getFeedbackSummary } from "@/lib/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function daysSince(date: string | null) {
  if (!date) return null;
  const time = new Date(`${date}T00:00:00Z`).getTime();
  if (Number.isNaN(time)) return null;
  return Math.floor((Date.now() - time) / 86_400_000);
}

export default async function KnowledgePage() {
  const stats = getCorpusStats();
  const documents = listCorpusDocuments();
  const viewer = await getViewer();
  const feedback = await getFeedbackSummary(viewer.organizationId);
  const staleDocuments = documents.filter((doc) => doc.status === "stale");
  const age = daysSince(stats.lastCapture);
  const outdated = age !== null && age > 90;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Base de conocimiento</h1>
        <p className="mt-1 text-sm text-slate-500">
          Corpus versionado de fuentes oficiales de uvigo.gal. Se regenera con <code className="rounded bg-slate-100 px-1">npm run ingest:uvigo</code>.
        </p>
      </div>

      {(staleDocuments.length > 0 || outdated) && (
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="text-sm text-amber-950">
              <p className="font-semibold">Revisión de fuentes pendiente</p>
              <ul className="mt-1 space-y-1 text-amber-900">
                {staleDocuments.length > 0 && (
                  <li>
                    {staleDocuments.length} fuente(s) no respondieron en la última ingesta y se conservan como{" "}
                    <strong>obsoletas</strong>: {staleDocuments.map((doc) => doc.title).join(", ")}.
                  </li>
                )}
                {outdated && (
                  <li>
                    La última captura tiene {age} días. Ejecuta <code className="rounded bg-amber-100 px-1">npm run ingest:uvigo</code>{" "}
                    para refrescar el corpus.
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Documentos", stats.documents],
          ["Oficiales", stats.officialDocuments],
          ["Obsoletas", stats.staleDocuments],
          ["PDFs", stats.pdfDocuments],
          ["Caracteres", stats.characters.toLocaleString("es-ES")],
        ].map(([label, value]) => (
          <Card key={label} className="border-slate-200 bg-white/90">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareWarning className="h-4 w-4 text-amber-600" /> Valoraciones a revisar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-6 text-sm text-slate-600">
            <span>
              Total: <strong className="text-slate-900">{feedback.total}</strong>
            </span>
            <span>
              Positivas: <strong className="text-emerald-700">{feedback.positiveRate}%</strong>
            </span>
            <span>
              Negativas: <strong className="text-rose-700">{feedback.negative}</strong>
            </span>
          </div>
          {feedback.needsReview.length === 0 ? (
            <p className="text-sm text-slate-500">Sin valoraciones negativas recientes.</p>
          ) : (
            <ul className="space-y-3">
              {feedback.needsReview.map((event) => (
                <li key={`${event.requestId}-${event.createdAt}`} className="rounded-lg border border-rose-100 bg-rose-50/60 p-3 text-sm">
                  <p className="font-medium text-rose-950">
                    {event.rating}/5 · {event.agent ?? "sin agente"} · {event.createdAt.slice(0, 10)}
                  </p>
                  {event.comment && <p className="mt-1 text-rose-900">{event.comment}</p>}
                  <p className="mt-1 font-mono text-[11px] text-rose-700/80">request {event.requestId}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Las valoraciones se guardan como evento de auditoría y sobreviven a reinicios cuando Supabase está configurado.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Fuentes indexadas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-medium">Documento</th>
                <th className="py-2 pr-4 font-medium">Tipo</th>
                <th className="py-2 pr-4 font-medium">Idioma</th>
                <th className="py-2 pr-4 font-medium">Revisión</th>
                <th className="py-2 font-medium">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-[420px] py-3 pr-4">
                    <p className="font-medium text-slate-800">{doc.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{doc.characters.toLocaleString("es-ES")} caracteres {doc.truncated ? "· truncado" : ""}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant="outline"
                      className={
                        doc.status === "official"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : doc.status === "stale"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                      }
                    >
                      {doc.status === "official" ? (doc.kind === "pdf" ? "PDF oficial" : "Oficial") : doc.status === "stale" ? "Obsoleta" : "Demo"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 uppercase text-slate-500">{doc.locale}</td>
                  <td className="py-3 pr-4 text-slate-500">{doc.reviewedAt}</td>
                  <td className="py-3">
                    <a href={doc.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                      Abrir <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <FileText className="h-3.5 w-3.5" />
        Las fuentes demo se conservan solo como respaldo y siempre se etiquetan como no oficiales.
      </p>
    </div>
  );
}
