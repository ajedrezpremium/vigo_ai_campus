import Link from "next/link";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/plataforma", label: "Plataforma" },
  { href: "/agentes", label: "Agentes" },
  { href: "/demo", label: "Demo" },
  { href: "/seguridad", label: "Seguridad" },
  { href: "/precios", label: "Precios" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            V
          </span>
          <span>VIGO AI CAMPUS</span>
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
          <Button render={<Link href="/login" />} variant="ghost" size="sm">
            Acceso
          </Button>
          <Button render={<Link href="/demo" />} size="sm">
            Probar demo
          </Button>
        </div>
      </div>
    </header>
  );
}
