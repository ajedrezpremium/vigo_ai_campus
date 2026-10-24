"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AuditEvent = {
  id: string;
  created_at: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
};

export function AuditTable() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<{ events: AuditEvent[]; source: string }>({
    queryKey: ["audit"],
    queryFn: async () => {
      const res = await fetch("/api/audit", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar la auditoría");
      return res.json();
    },
  });

  return (
    <Card className="border-slate-200 bg-white/90">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><ScrollText className="h-4 w-4" /> Auditoría</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Eventos de seguridad, consultas, tickets y sincronizaciones.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-slate-500">Cargando eventos…</p>}
        {isError && <p className="text-sm text-rose-600">No se pudo cargar la auditoría.</p>}
        {!isLoading && !isError && (data?.events.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            Sin eventos de auditoría todavía.
          </div>
        )}
        {!!data?.events.length && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-medium">Fecha</th>
                  <th className="py-2 pr-4 font-medium">Acción</th>
                  <th className="py-2 pr-4 font-medium">Objeto</th>
                  <th className="py-2 font-medium">Metadatos</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event) => (
                  <tr key={event.id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="py-3 pr-4 text-slate-500">{new Date(event.created_at).toLocaleString("es-ES")}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className={event.action.startsWith("security") ? "border-rose-200 bg-rose-50 text-rose-700" : ""}>
                        {event.action}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {event.target_type ?? "—"}
                      {event.target_id ? <span className="ml-1 font-mono text-[10px] text-slate-400">{event.target_id.slice(0, 8)}</span> : null}
                    </td>
                    <td className="max-w-[340px] py-3">
                      <pre className="max-h-24 overflow-auto rounded-lg bg-slate-950 p-2 text-[10px] leading-relaxed text-slate-100">
                        {JSON.stringify(event.metadata ?? {}, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
