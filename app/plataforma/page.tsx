import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlataformaPage() {
  const modules = [
    "Superagente Campus AI",
    "Student Services",
    "Trámites e incidencias",
    "Panel administrativo SaaS",
    "Atención multilingüe",
    "Integraciones autorizadas (fase posterior)",
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Plataforma</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Arquitectura modular para coordinar servicios universitarios con aislamiento por organización,
        fuentes autorizadas y control de permisos.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Card key={m}>
            <CardHeader>
              <CardTitle className="text-base">{m}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Módulo de la plataforma. La demo actual implementa el superagente y el flujo de derivación.
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
