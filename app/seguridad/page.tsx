import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function SeguridadPage() {
  const locale = await getLocale();
  const t = messages[locale].security;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">{t.title}</h1>
      <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
        {t.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
