import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function PreciosPage() {
  const locale = await getLocale();
  const t = messages[locale].pricing;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">{t.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.intro}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {t.plans.map((plan) => (
          <Card key={plan.name}>
            <CardHeader>
              <CardTitle className="text-base">{plan.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-primary">{plan.price}</p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
