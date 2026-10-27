import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Bot,
  Building2,
  FileText,
  LayoutDashboard,
  ScrollText,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { getViewer } from "@/lib/auth";
import { can, roleLabel } from "@/lib/roles";
import { AdminProviders } from "@/components/admin/admin-providers";
import { Badge } from "@/components/ui/badge";

export const instant = false;

const NAV = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, permission: "admin.access" as const },
  { href: "/admin/analytics", label: "Métricas", icon: Activity, permission: "metrics.read" as const },
  { href: "/admin/tickets", label: "Derivaciones", icon: Ticket, permission: "tickets.manage" as const },
  { href: "/admin/conversations", label: "Conversaciones", icon: FileText, permission: "conversations.read.org" as const },
  { href: "/admin/knowledge", label: "Conocimiento", icon: Sparkles, permission: "knowledge.read" as const },
  { href: "/admin/audit", label: "Auditoría", icon: ScrollText, permission: "audit.read" as const },
  { href: "/admin/ai", label: "Estado IA", icon: Bot, permission: "metrics.read" as const },
  { href: "/admin/members", label: "Miembros", icon: Users, permission: "members.manage" as const },
  { href: "/admin/organizations", label: "Organizaciones", icon: Building2, permission: "members.manage" as const },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/login?next=/admin");
  }

  if (!can(viewer.role, "admin.access")) {
    return (
      <div lang="es" className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-amber-950">Acceso restringido</h1>
          <p className="mt-2 text-sm text-amber-800">
            Tu cuenta tiene rol <strong>{roleLabel(viewer.role)}</strong>. El panel de administración requiere rol PAS o administración.
          </p>
          {viewer.mode === "demo" && (
            <p className="mt-2 text-xs text-amber-700">
              Estás en modo demo sin privilegios. Para explorar el panel en local, define
              {" "}<code className="rounded bg-amber-100 px-1">DEMO_ADMIN=true</code>.
            </p>
          )}
          <Link href="/app" className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Volver a mi espacio
          </Link>
        </div>
      </div>
    );
  }

  const links = NAV.filter((item) => can(viewer.role, item.permission));

  return (
    <AdminProviders>
      <div lang="es" className="min-h-[70vh] bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[230px_1fr]">
          <aside>
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="px-2 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Panel</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-900">{viewer.organizationName ?? "VIGO AI CAMPUS"}</p>
                <Badge variant="outline" className="mt-2 text-[10px]">{roleLabel(viewer.role)}</Badge>
              </div>
              <nav className="space-y-1" aria-label="Navegación de administración">
                {links.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-cyan-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-3 border-t pt-3">
                <Link href="/app/chat" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary hover:bg-cyan-50">
                  <Bot className="h-4 w-4" /> Abrir superagente
                </Link>
              </div>
            </div>
          </aside>
          <main className="min-w-0">
            {viewer.mode === "demo" && (
              <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs text-cyan-900">
                Modo demo sin Supabase: las métricas y tickets se guardan en memoria de esta instancia.
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </AdminProviders>
  );
}
