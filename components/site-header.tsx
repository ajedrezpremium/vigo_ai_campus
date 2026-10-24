"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, type Locale } from "@/lib/i18n";

function Logo3D() {
  return (
    <div className="relative flex items-center gap-3">
      <div className="relative h-11 w-11" style={{ perspective: 800 }}>
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-cyan-500 to-indigo-600 shadow-[0_8px_24px_rgba(37,99,235,0.45)]"
          style={{ transform: "rotateX(14deg) rotateY(-22deg)", transformStyle: "preserve-3d" }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">V</div>
          <div className="absolute -bottom-2 left-2 right-2 h-3 rounded-full bg-primary/50 blur-md" style={{ transform: "translateZ(-12px)" }} />
          <div className="absolute inset-0 rounded-2xl border border-white/30" style={{ transform: "translateZ(6px)" }} />
        </div>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">VIGO AI</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">CAMPUS</span>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const nav = [
    { href: "/", label: t.nav.home },
    { href: "/plataforma", label: t.nav.platform },
    { href: "/agentes", label: t.nav.agents },
    { href: "/demo", label: t.nav.demo },
    { href: "/seguridad", label: t.nav.security },
    { href: "/precios", label: t.nav.pricing },
    { href: "/contacto", label: t.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold" aria-label="VIGO AI CAMPUS, inicio">
          <Logo3D />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="h-8 rounded-md border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Idioma de la interfaz"
          >
            <option value="es">ES</option>
            <option value="gl">GL</option>
            <option value="en">EN</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
            title={theme === "dark" ? "Tema claro" : "Tema oscuro"}
          >
            {theme === "dark" ? "☀" : "☾"}
          </Button>
          <Button render={<Link href="/login" />} variant="ghost" size="sm" className="hidden sm:inline-flex">
            {t.nav.access}
          </Button>
          <Button render={<Link href="/demo" />} size="sm" className="hidden sm:inline-flex">
            {t.cta.tryDemo}
          </Button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t bg-background md:hidden">
          <nav className="mx-auto grid max-w-6xl gap-1 px-4 py-3" aria-label="Navegación móvil">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button render={<Link href="/login" onClick={() => setOpen(false)} />} variant="outline" size="sm">Acceso</Button>
              <Button render={<Link href="/demo" onClick={() => setOpen(false)} />} size="sm">Probar demo</Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
