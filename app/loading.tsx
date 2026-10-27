import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function Loading() {
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t.errors.loading}</span>
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
