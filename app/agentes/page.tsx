import { AGENTS } from "@/lib/agents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AgentesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Agentes</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Coordinador y agentes lógicos con responsabilidades delimitadas y herramientas controladas.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a) => (
          <Card key={a.slug}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${a.color}`} />
                <CardTitle className="text-base">{a.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {a.description}
              <div className="mt-3">
                <Badge variant="outline">{a.slug}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
