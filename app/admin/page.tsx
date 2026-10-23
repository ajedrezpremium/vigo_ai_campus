import Link from "next/link";

const links = [
  ["organizations", "Organizaciones"],
  ["members", "Miembros"],
  ["agents", "Agentes"],
  ["knowledge", "Conocimiento"],
  ["conversations", "Conversaciones"],
  ["tickets", "Tickets"],
  ["analytics", "Analítica"],
  ["audit", "Auditoría"],
];

export default function AdminHome() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Administración (demo)</h1>
      <p className="mt-2 text-muted-foreground">
        Panel protegido: en producción requiere autenticación y roles. Demo sin credenciales.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {links.map(([slug, label]) => (
          <Link key={slug} href={`/admin/${slug}`} className="rounded-lg border p-4 hover:bg-muted">
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">/admin/{slug}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
