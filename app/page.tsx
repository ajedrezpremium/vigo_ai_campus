import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    title: "Un único punto de entrada",
    text: "Un superagente coordina consultas sobre matrícula, becas, calendarios y servicios.",
  },
  {
    title: "Respuestas con fuentes",
    text: "Cada respuesta incluye referencias verificables y señala la incertidumbre.",
  },
  {
    title: "Derivación controlada",
    text: "Cuando no hay evidencia, el caso se deriva al servicio adecuado con resumen.",
  },
  {
    title: "Multiuniversidad",
    text: "Arquitectura preparada para aislar datos, fuentes, marca y permisos por organización.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/20">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Badge variant="secondary" className="mb-4">
            Demo independiente · No oficial
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-primary md:text-6xl">
            Un campus. Un superagente. Todos los servicios.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            VIGO AI CAMPUS es una plataforma demo que coordina servicios universitarios mediante
            un superagente de IA y agentes especializados, con fuentes verificables y derivación
            de casos no resueltos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button render={<Link href="/demo" />} size="lg">
              Probar demo
            </Button>
            <Button render={<Link href="/plataforma" />} variant="outline" size="lg">
              Ver plataforma
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Los datos de la demo son ficticios y están claramente etiquetados. No implica respaldo
            de ninguna universidad.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{f.text}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold text-primary">Cómo funciona</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            <li className="rounded-lg border bg-background p-5">
              <span className="text-sm font-medium text-accent-foreground">1. Consulta</span>
              <p className="mt-2 text-sm text-muted-foreground">
                El estudiante pregunta en lenguaje natural.
              </p>
            </li>
            <li className="rounded-lg border bg-background p-5">
              <span className="text-sm font-medium text-accent-foreground">2. Recuperación</span>
              <p className="mt-2 text-sm text-muted-foreground">
                El agente busca en fuentes autorizadas y cita las relevantes.
              </p>
            </li>
            <li className="rounded-lg border bg-background p-5">
              <span className="text-sm font-medium text-accent-foreground">3. Derivación</span>
              <p className="mt-2 text-sm text-muted-foreground">
                Si no hay evidencia, se crea una derivación al servicio adecuado.
              </p>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
