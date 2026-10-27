import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function Page() {
  const locale = await getLocale();
  const t = messages[locale];

  const links = [
    { href: "/", label: t.nav.home },
    { href: "/plataforma", label: t.nav.platform },
    { href: "/agentes", label: t.nav.agents },
    { href: "/demo", label: t.nav.demo },
    { href: "/seguridad", label: t.nav.security },
    { href: "/precios", label: t.nav.pricing },
    { href: "/contacto", label: t.nav.contact },
    { href: "/login", label: t.nav.access },
    { href: "/app", label: t.dashboard.title },
    { href: "/app/chat", label: t.dashboard.superagent },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-primary">{t.sitemap.title}</h1>
      <ul className="mt-4 space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-primary underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
