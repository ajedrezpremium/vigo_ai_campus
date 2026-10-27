export const LOCALES = ["es", "gl", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

/** Cookie leída en el servidor para renderizar el idioma sin parpadeo. */
export const LOCALE_COOKIE = "vigo-locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  es: "Español",
  gl: "Galego",
  en: "English",
};

export const LOCALE_NAMES: Record<Locale, string> = {
  es: "español",
  gl: "galego",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
