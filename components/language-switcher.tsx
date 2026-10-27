"use client";
import { useI18n, type Locale } from "@/lib/i18n";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className="h-8 rounded-md border bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={t.common.language}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
      ))}
    </select>
  );
}
