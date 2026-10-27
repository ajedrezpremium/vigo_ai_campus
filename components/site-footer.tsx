"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  const cols = [
    {
      title: t.footer.product,
      links: [
        { href: "/plataforma", label: t.nav.platform },
        { href: "/agentes", label: t.nav.agents },
        { href: "/precios", label: t.nav.pricing },
      ],
    },
    {
      title: t.footer.trust,
      links: [
        { href: "/seguridad", label: t.nav.security },
        { href: "/implantacion", label: t.implementation.title },
        { href: "/terminos", label: t.footer.terms },
        { href: "/cookies", label: t.footer.cookies },
      ],
    },
    {
      title: t.footer.site,
      links: [
        { href: "/mapa-sitio", label: t.footer.sitemap },
        { href: "/contacto", label: t.nav.contact },
        { href: "/demo", label: t.nav.demo },
      ],
    },
  ];
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="font-semibold text-primary">VIGO AI CAMPUS</p>
            <p className="mt-2 text-sm text-muted-foreground">{t.footer.tagline}</p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-medium">{c.title}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-foreground">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-muted-foreground">{t.footer.copyright}</p>
      </div>
    </footer>
  );
}
