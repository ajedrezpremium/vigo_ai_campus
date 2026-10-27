import { AGENTS } from "@/lib/agents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function AgentesPage() {
  const locale = await getLocale();
  const t = messages[locale].agents;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">{t.title}</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">{t.intro}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((agent) => (
          <Card key={agent.slug}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${agent.color}`} />
                <CardTitle className="text-base">{agent.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t.descriptions[agent.slug]}
              <div className="mt-3">
                <Badge variant="outline">{agent.slug}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
