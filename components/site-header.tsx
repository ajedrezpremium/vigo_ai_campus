"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

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
  const { t } = useI18n();
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
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold" aria-label={t.nav.homeLabel}>
          <Logo3D />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t.nav.main}>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? t.theme.light : t.theme.dark} title={theme === "dark" ? t.theme.light : t.theme.dark}>
            {theme === "dark" ? "☀" : "☾"}
          </Button>
          <a href="/login" className="hidden sm:inline-flex rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{t.nav.access}</a>
          <a href="/demo" className="hidden sm:inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm hover:bg-primary/90">{t.cta.tryDemo}</a>
          <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground md:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? t.nav.closeMenu : t.nav.openMenu}>
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {open && (
          <div id="mobile-nav" className="border-t bg-background md:hidden">
            <nav className="mx-auto grid max-w-6xl gap-1 px-4 py-3" aria-label={t.nav.mobile}>
              {nav.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{item.label}</Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <a href="/login" onClick={() => setOpen(false)} className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{t.nav.access}</a>
                <a href="/demo" onClick={() => setOpen(false)} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm hover:bg-primary/90">{t.cta.tryDemo}</a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}