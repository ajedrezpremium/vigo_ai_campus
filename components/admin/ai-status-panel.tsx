"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, Sparkles, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type LLMStatus = {
  configured: boolean;
  provider: string;
  keyLabel: string | null;
  freeTier: boolean | null;
  quota: { limit: number; used: number; remaining: number; resetAt: string; freeTier: boolean } | null;
  quotaExhausted: boolean;
  models: string[];
  lastError: string | null;
  lastSuccess: { model: string; at: string } | null;
  calls: number;
};

export function AiStatusPanel() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<LLMStatus>({
    queryKey: ["llm-status"],
    queryFn: async () => {
      const res = await fetch("/api/llm/status?refresh=1", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo consultar el estado de OpenRouter");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />;
  if (isError || !data) {
    return (
      <Card className="border-rose-200 bg-rose-50">
        <CardContent className="p-6 text-sm text-rose-800">
          No se pudo consultar el estado del proveedor.
          <Button variant="outline" className="ml-3" size="sm" onClick={() => refetch()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  const pct = data.quota ? Math.min(100, Math.round((data.quota.used / Math.max(data.quota.limit, 1)) * 100)) : 0;
  const reset = data.quota ? new Date(data.quota.resetAt) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Estado de la IA</h1>
          <p className="mt-1 text-sm text-slate-500">OpenRouter · modelos gratuitos · diagnóstico en tiempo real</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={data.configured ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50"}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              {data.configured ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
              <p className="font-semibold">{data.configured ? "Clave configurada" : "Sin clave"}</p>
            </div>
            <p className="mt-2 text-sm text-slate-600">{data.keyLabel ?? "Añade LLM_API_KEY en Vercel"}</p>
            <Badge variant="outline" className="mt-3 bg-white/70">{data.provider}</Badge>
          </CardContent>
        </Card>

        <Card className={data.quotaExhausted ? "border-amber-200 bg-amber-50/60" : "border-cyan-200 bg-cyan-50/50"}>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Cuota diaria free</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {data.quota ? `${data.quota.remaining}` : "—"}
              <span className="ml-1 text-base font-medium text-slate-500">restantes</span>
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white">
              <div className={`h-full rounded-full ${pct >= 100 ? "bg-amber-500" : "bg-cyan-500"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {data.quota ? `${data.quota.used}/${data.quota.limit} usadas` : "Sin datos de cuota"}
              {reset ? ` · reinicio ${reset.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" })} UTC` : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/90">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Última llamada correcta</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{data.lastSuccess?.model ?? "Aún no hay llamadas"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {data.lastSuccess ? new Date(data.lastSuccess.at).toLocaleString("es-ES") : "Se activará al renovarse la cuota"}
            </p>
            <p className="mt-3 text-xs text-slate-500">Llamadas en esta instancia: {data.calls}</p>
          </CardContent>
        </Card>
      </div>

      {data.quotaExhausted && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-amber-950">La cuota gratuita está agotada</p>
            <p className="mt-1 text-sm text-amber-800">
              OpenRouter limita a 50 peticiones/día con menos de 10 créditos. El chat sigue respondiendo con el compositor basado en fuentes oficiales.
              Añadir 10 créditos una sola vez desbloquea 1.000 peticiones free/día.
            </p>
          </div>
          <Button render={<a href="https://openrouter.ai/settings/credits" target="_blank" rel="noreferrer" />} size="sm">
            Ver créditos <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {data.lastError && (
        <Card className="border-slate-200 bg-white/90">
          <CardHeader><CardTitle className="text-base">Último error</CardTitle></CardHeader>
          <CardContent><pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{data.lastError}</pre></CardContent>
        </Card>
      )}

      <Card className="border-slate-200 bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-cyan-600" /> Modelos en orden de preferencia</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {data.models.map((model, index) => (
              <li key={model} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm">
                <span className="truncate font-mono text-xs text-slate-700">{model}</span>
                <Badge variant="outline" className="shrink-0 text-[10px]">#{index + 1}</Badge>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <TimerReset className="h-3.5 w-3.5" />
            Si un modelo falla o está saturado, se prueba el siguiente automáticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
