import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function PlataformaPage() {
  const locale = await getLocale();
  const t = messages[locale].platform;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">{t.title}</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">{t.intro}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {t.modules.map((module) => (
          <Card key={module}>
            <CardHeader>
              <CardTitle className="text-base">{module}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{t.moduleNote}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
