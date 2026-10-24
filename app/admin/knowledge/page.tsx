export const instant = false;

import { connection } from "next/server";
import { ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { getCorpusStats, listCorpusDocuments } from "@/lib/retrieval";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function KnowledgePage() {
  const stats = getCorpusStats();
  const documents = listCorpusDocuments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Base de conocimiento</h1>
        <p className="mt-1 text-sm text-slate-500">
          Corpus versionado de fuentes oficiales de uvigo.gal. Se regenera con <code className="rounded bg-slate-100 px-1">npm run ingest:uvigo</code>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Documentos", stats.documents],
          ["Oficiales", stats.officialDocuments],
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
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Fuentes indexadas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-medium">Documento</th>
                <th className="py-2 pr-4 font-medium">Tipo</th>
                <th className="py-2 pr-4 font-medium">Idioma</th>
                <th className="py-2 pr-4 font-medium">Captura</th>
                <th className="py-2 font-medium">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-[420px] py-3 pr-4">
                    <p className="font-medium text-slate-800">{doc.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{doc.characters.toLocaleString("es-ES")} caracteres {doc.truncated ? "Â· truncado" : ""}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className={doc.status === "official" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                      {doc.status === "official" ? (doc.kind === "pdf" ? "PDF oficial" : "Oficial") : "Demo"}
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

