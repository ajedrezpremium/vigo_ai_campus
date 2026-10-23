"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useI18n, type Locale } from "@/lib/i18n";

function Logo3D() {
  return (
    <div className="relative flex items-center gap-2">
      <div
        className="relative h-9 w-9"
        style={{ perspective: 600 }}
      >
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-cyan-500 shadow-lg"
          style={{ transform: "rotateX(12deg) rotateY(-18deg)", transformStyle: "preserve-3d" }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-white drop-shadow-md">
            V
          </div>
          <div
            className="absolute -bottom-1 left-1 right-1 h-2 rounded-full bg-primary/40 blur-sm"
            style={{ transform: "translateZ(-8px)" }}
          />
        </div>
      </div>
      <span className="bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-lg font-bold text-transparent">
        VIGO AI
      </span>
    </div>
  );
}

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo3D />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="h-8 rounded-md border bg-background px-2 text-xs"
            aria-label="Idioma"
          >
            <option value="es">ES</option>
            <option value="gl">GL</option>
            <option value="en">EN</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "☀" : "☾"}
          </Button>
          <Button render={<Link href="/login" />} variant="ghost" size="sm">
            {t.nav.access}
          </Button>
          <Button render={<Link href="/demo" />} size="sm">
            {t.cta.tryDemo}
          </Button>
        </div>
      </div>
    </header>
  );
}
