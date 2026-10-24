"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Ticket = {
  id: string;
  summary: string;
  category: string;
  status: string;
  created_at?: string;
  createdAt?: string;
  persisted?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  open: "Abierto",
  in_progress: "En curso",
  resolved: "Resuelto",
  closed: "Cerrado",
};

export function TicketsTable() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading, isError, refetch, isFetching } = useQuery<{ tickets: Ticket[]; persisted: boolean }>({
    queryKey: ["tickets"],
    queryFn: async () => {
      const res = await fetch("/api/tickets", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar las derivaciones");
      return res.json();
    },
  });

  const tickets = (data?.tickets ?? []).filter((t) => filter === "all" || t.status === filter);

  return (
    <Card className="border-slate-200 bg-white/90">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg">Derivaciones y tickets</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Casos que el agente no pudo resolver con evidencia suficiente.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos</option>
            <option value="open">Abiertos</option>
            <option value="in_progress">En curso</option>
            <option value="resolved">Resueltos</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-slate-500">Cargando derivaciones…</p>}
        {isError && <p className="text-sm text-rose-600">No se pudieron cargar las derivaciones.</p>}
        {!isLoading && !isError && tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <Inbox className="h-8 w-8 text-slate-400" />
            <p className="mt-3 font-medium text-slate-700">Sin derivaciones todavía</p>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Cuando una consulta no tenga evidencia suficiente, aparecerá aquí con su resumen y categoría.
            </p>
          </div>
        )}
        {tickets.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-medium">Resumen</th>
                  <th className="py-2 pr-4 font-medium">Categoría</th>
                  <th className="py-2 pr-4 font-medium">Fecha</th>
                  <th className="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-slate-100 last:border-0">
                    <td className="max-w-[380px] py-3 pr-4">
                      <p className="line-clamp-2 font-medium text-slate-800">{ticket.summary}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{ticket.id.slice(0, 8)}</p>
                    </td>
                    <td className="py-3 pr-4"><Badge variant="outline">{ticket.category}</Badge></td>
                    <td className="py-3 pr-4 text-slate-500">
                      {new Date(ticket.created_at ?? ticket.createdAt ?? Date.now()).toLocaleString("es-ES")}
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary" className={ticket.status === "open" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}>
                        {STATUS_LABEL[ticket.status] ?? ticket.status}
                      </Badge>
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
