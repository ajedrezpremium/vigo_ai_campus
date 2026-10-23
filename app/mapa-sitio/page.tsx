import Link from "next/link";

export default function Page() {
  const links = ["/", "/plataforma", "/agentes", "/demo", "/seguridad", "/precios", "/contacto", "/login", "/app", "/app/chat"];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-primary">Mapa del sitio</h1>
      <ul className="mt-4 space-y-1">
        {links.map((l) => (
          <li key={l}>
            <Link href={l} className="text-primary underline">
              {l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
