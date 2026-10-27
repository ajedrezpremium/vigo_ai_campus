import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function NotFound() {
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">404</p>
      <h1 className="mt-3 text-3xl font-bold text-foreground">{t.errors.notFoundTitle}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.errors.notFoundBody}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t.nav.home}
        </Link>
        <Link
          href="/app/chat"
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {t.common.openAgent}
        </Link>
      </div>
    </div>
  );
}
