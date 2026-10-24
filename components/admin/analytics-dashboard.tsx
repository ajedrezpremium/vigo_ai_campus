"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  Timer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Metrics = {
  source: "supabase" | "memory";
  generatedAt: string;
  totals: {
    requests: number;
    resolved: number;
    escalated: number;
    resolvedRate: number;
    escalationRate: number;
    inputTokens: number;
    outputTokens: number;
    conversations: number;
    ticketsOpen: number;
    ticketsTotal: number;
  };
  latency: { p50: number; p95: number; max: number };
  byAgent: { agent: string; requests: number; resolved: number; escalated: number; p95: number }[];
  days: { date: string; requests: number; resolved: number; escalated: number }[];
  recent: { id: string; timestamp: string; agent: string; latencyMs: number; resolved: boolean; escalated: boolean; citations: number }[];
  viewer: { role: string; organization: string | null; mode: string };
};

const COLORS = ["#0891b2", "#2563eb", "#10b981", "#f59e0b", "#8b5cf6"];

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
}

function shortDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("es-ES", { day: "2-digit", month: "short", timeZone: "UTC" });
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  accent = "text-primary",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="border-slate-200 bg-white/90 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-2 text-3xl font-black tracking-tight ${accent}`}>{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
          </div>
          <span className="rounded-xl bg-slate-50 p-2 text-slate-500">
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<Metrics>({
    queryKey: ["metrics"],
    queryFn: async () => {
      const res = await fetch("/api/metrics", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar las métricas");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-rose-200 bg-rose-50">
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <p className="font-semibold text-rose-900">No se pudieron cargar las métricas</p>
          <p className="text-sm text-rose-700">{error instanceof Error ? error.message : "Error desconocido"}</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasData = data.totals.requests > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Métricas y observabilidad</h1>
          <p className="mt-1 text-sm text-slate-500">
            Últimos 7 días · {data.viewer.organization ?? "Sin organización"} · fuente:{" "}
            {data.source === "supabase" ? "Supabase (persistente)" : "memoria de esta instancia"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {!hasData && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Todavía no hay consultas registradas en este periodo. Abre el{" "}
          <a className="font-semibold text-primary underline" href="/app/chat">
            superagente
          </a>{" "}
          y realiza una consulta para ver latencia, derivaciones y consumo.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={MessageSquareText} label="Consultas" value={formatNumber(data.totals.requests)} hint={`${data.totals.conversations} conversaciones guardadas`} />
        <Kpi icon={Activity} label="Resueltas" value={`${data.totals.resolvedRate}%`} hint={`${formatNumber(data.totals.resolved)} sin derivación`} accent="text-emerald-600" />
        <Kpi icon={ShieldAlert} label="Derivadas" value={`${data.totals.escalationRate}%`} hint={`${formatNumber(data.totals.escalated)} requieren apoyo humano`} accent="text-amber-600" />
        <Kpi icon={Timer} label="Latencia p95" value={`${data.latency.p95} ms`} hint={`p50 ${data.latency.p50} ms · máx ${data.latency.max} ms`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 bg-white/90">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tokens de entrada</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{formatNumber(data.totals.inputTokens)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white/90">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tokens de salida</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{formatNumber(data.totals.outputTokens)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white/90">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tickets abiertos</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{formatNumber(data.totals.ticketsOpen)}</p>
            <p className="text-xs text-slate-500">de {formatNumber(data.totals.ticketsTotal)} totales</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-slate-200 bg-white/90">
          <CardHeader>
            <CardTitle className="text-base">Actividad diaria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.days} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="requests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(value) => shortDate(String(value))}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="requests" name="Consultas" stroke="#0891b2" fill="url(#requests)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" name="Resueltas" stroke="#10b981" fill="url(#resolved)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/90">
          <CardHeader>
            <CardTitle className="text-base">Uso por agente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byAgent} layout="vertical" margin={{ top: 4, right: 12, left: 12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="agent" width={110} tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="requests" name="Consultas" radius={[0, 6, 6, 0]}>
                    {data.byAgent.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white/90">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Últimas consultas</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            <Clock3 className="mr-1 h-3 w-3" /> auto-refresh 30 s
          </Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-medium">Hora</th>
                <th className="py-2 pr-4 font-medium">Agente</th>
                <th className="py-2 pr-4 font-medium">Latencia</th>
                <th className="py-2 pr-4 font-medium">Fuentes</th>
                <th className="py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-4 text-slate-500">{new Date(row.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2.5 pr-4 font-medium text-slate-800">{row.agent}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{row.latencyMs} ms</td>
                  <td className="py-2.5 pr-4 text-slate-600">{row.citations}</td>
                  <td className="py-2.5">
                    {row.escalated ? (
                      <Badge variant="secondary" className="bg-amber-50 text-amber-700">Derivada</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Resuelta</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {!data.recent.length && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-slate-500">Sin consultas registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <ArrowUpRight className="h-3.5 w-3.5" />
        Las métricas se guardan en <code className="rounded bg-slate-100 px-1">audit_events</code> y se agregan en servidor.
      </p>
    </div>
  );
}
