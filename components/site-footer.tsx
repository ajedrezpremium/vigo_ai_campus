"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  const cols = [
    { title: "Producto", links: [{ href: "/plataforma", label: "Plataforma" }, { href: "/agentes", label: "Agentes" }, { href: "/precios", label: "Precios" }] },
    { title: "Confianza", links: [{ href: "/seguridad", label: "Seguridad" }, { href: "/implantacion", label: "Implantación" }, { href: "/terminos", label: t.footer.terms }, { href: "/cookies", label: t.footer.cookies }] },
    { title: "Sitio", links: [{ href: "/mapa-sitio", label: t.footer.sitemap }, { href: "/contacto", label: "Contacto" }, { href: "/demo", label: "Demo" }] },
  ];
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="font-semibold text-primary">VIGO AI CAMPUS</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Demo independiente y no oficial. Datos ficticios etiquetados.
            </p>
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
        <p className="mt-8 text-xs text-muted-foreground">
          © 2026 VIGO AI CAMPUS. No respaldado por ninguna universidad. Fuentes de demo ficticias.
        </p>
      </div>
    </footer>
  );
}
