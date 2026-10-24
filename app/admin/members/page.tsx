export const instant = false;

import { connection } from "next/server";
import { Users } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeRole, roleLabel } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROLE_STYLE: Record<string, string> = {
  admin: "border-violet-200 bg-violet-50 text-violet-700",
  pas: "border-sky-200 bg-sky-50 text-sky-700",
  pdi: "border-emerald-200 bg-emerald-50 text-emerald-700",
  estudiante: "border-slate-200 bg-slate-50 text-slate-700",
};

export default async function MembersPage() {
  await connection();
  const viewer = await getViewer();
  const admin = getSupabaseAdminClient();
  let rows: { id: string; role: string; organization: string; email: string; userId: string }[] = [];

  if (admin && viewer.organizationId) {
    const [{ data: memberships }, { data: users }] = await Promise.all([
      admin
        .from("memberships")
        .select("id, user_id, role, organizations(name)")
        .eq("organization_id", viewer.organizationId)
        .limit(100),
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);
    const emailById = new Map((users?.users ?? []).map((user) => [user.id, user.email ?? ""]));
    rows = (memberships ?? []).map((membership) => {
      const org = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
      return {
        id: membership.id,
        role: membership.role,
        organization: org?.name ?? "â€”",
        email: emailById.get(membership.user_id) ?? membership.user_id.slice(0, 8),
        userId: membership.user_id,
      };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Miembros y roles</h1>
        <p className="mt-1 text-sm text-slate-500">
          Roles de producto: estudiante, PAS, PDI y administraciÃ³n. La base de datos usa <code className="rounded bg-slate-100 px-1">org_admin</code>, <code className="rounded bg-slate-100 px-1">operator</code> y <code className="rounded bg-slate-100 px-1">user</code>.
        </p>
      </div>

      <Card className="border-slate-200 bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> {rows.length} miembros</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              Sin miembros en esta organizaciÃ³n. Crea una cuenta y ejecuta la provisiÃ³n automÃ¡tica.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-medium">Usuario</th>
                    <th className="py-2 pr-4 font-medium">OrganizaciÃ³n</th>
                    <th className="py-2 pr-4 font-medium">Rol BD</th>
                    <th className="py-2 font-medium">Rol de producto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const role = normalizeRole(row.role);
                    return (
                      <tr key={row.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-slate-800">{row.email}</p>
                          <p className="font-mono text-[10px] text-slate-400">{row.userId}</p>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{row.organization}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-500">{row.role}</td>
                        <td className="py-3"><Badge variant="outline" className={ROLE_STYLE[role]}>{roleLabel(role)}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

