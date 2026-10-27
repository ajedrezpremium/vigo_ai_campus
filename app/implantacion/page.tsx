import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function ImplantacionPage() {
  const locale = await getLocale();
  const t = messages[locale].implementation;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">{t.title}</h1>
      <ol className="mt-6 space-y-3">
        {t.steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm">
            <span className="font-semibold text-primary">{index + 1}.</span>
            <span className="text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
