import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function Page() {
  const locale = await getLocale();
  const t = messages[locale].legal;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-primary">{t.cookiesTitle}</h1>
      <p className="mt-2 text-muted-foreground">{t.cookiesBody}</p>
    </div>
  );
}
