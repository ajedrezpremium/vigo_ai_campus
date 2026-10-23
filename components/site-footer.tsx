import Link from "next/link";

export function SiteFooter() {
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
          <div>
            <p className="text-sm font-medium">Producto</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><Link href="/plataforma">Plataforma</Link></li>
              <li><Link href="/agentes">Agentes</Link></li>
              <li><Link href="/precios">Precios</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">Confianza</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><Link href="/seguridad">Seguridad</Link></li>
              <li><Link href="/implantacion">Implantación</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">Contacto</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><Link href="/contacto">Formulario</Link></li>
              <li><Link href="/demo">Demo</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          © 2026 VIGO AI CAMPUS. No respaldado por ninguna universidad. Fuentes de demo ficticias.
        </p>
      </div>
    </footer>
  );
}
