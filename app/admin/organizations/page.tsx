export const instant = false;

import { connection } from "next/server";
import { Building2 } from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLE: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  demo: "border-cyan-200 bg-cyan-50 text-cyan-700",
  suspended: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function OrganizationsPage() {
  await connection();
  const admin = getSupabaseAdminClient();
  const organizations = admin ? (await admin.from("organizations").select("id, name, slug, status, default_locale, created_at").order("created_at")).data ?? [] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Organizaciones</h1>
        <p className="mt-1 text-sm text-slate-500">Aislamiento multi-tenant: cada organizaciÃ³n tiene sus propios miembros, fuentes y conversaciones.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {organizations.map((organization) => (
          <Card key={organization.id} className="border-slate-200 bg-white/90">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> {organization.name}</CardTitle>
                <p className="mt-1 font-mono text-xs text-slate-400">{organization.slug}</p>
              </div>
              <Badge variant="outline" className={STATUS_STYLE[organization.status] ?? ""}>{organization.status}</Badge>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p>Idioma por defecto: <strong className="uppercase">{organization.default_locale}</strong></p>
              <p className="mt-1">Creada: {new Date(organization.created_at).toLocaleDateString("es-ES")}</p>
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-400">{organization.id}</p>
            </CardContent>
          </Card>
        ))}
        {organizations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 md:col-span-2">
            Sin organizaciones. Supabase no estÃ¡ configurado o la tabla estÃ¡ vacÃ­a.
          </div>
        )}
      </div>
    </div>
  );
}

