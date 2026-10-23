/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Locale = "es" | "gl" | "en";

const dictionaries = {
  es: {
    brand: "VIGO AI CAMPUS",
    tagline: "Un campus. Un superagente. Todos los servicios.",
    nav: {
      home: "Inicio",
      platform: "Plataforma",
      agents: "Agentes",
      demo: "Demo",
      security: "Seguridad",
      pricing: "Precios",
      contact: "Contacto",
      access: "Acceso",
    },
    theme: { light: "Claro", dark: "Oscuro" },
    footer: {
      terms: "Términos legales",
      sitemap: "Mapa del sitio",
      cookies: "Política de cookies",
      privacy: "Privacidad",
    },
    cta: { tryDemo: "Probar demo", platform: "Ver plataforma" },
  },
  gl: {
    brand: "VIGO AI CAMPUS",
    tagline: "Un campus. Un superaxente. Todos os servizos.",
    nav: {
      home: "Inicio",
      platform: "Plataforma",
      agents: "Axentes",
      demo: "Demo",
      security: "Seguridade",
      pricing: "Prezos",
      contact: "Contacto",
      access: "Acceso",
    },
    theme: { light: "Claro", dark: "Escuro" },
    footer: {
      terms: "Termos legais",
      sitemap: "Mapa do sitio",
      cookies: "Política de cookies",
      privacy: "Privacidade",
    },
    cta: { tryDemo: "Probar demo", platform: "Ver plataforma" },
  },
  en: {
    brand: "VIGO AI CAMPUS",
    tagline: "One campus. One superagent. All services.",
    nav: {
      home: "Home",
      platform: "Platform",
      agents: "Agents",
      demo: "Demo",
      security: "Security",
      pricing: "Pricing",
      contact: "Contact",
      access: "Access",
    },
    theme: { light: "Light", dark: "Dark" },
    footer: {
      terms: "Legal terms",
      sitemap: "Sitemap",
      cookies: "Cookie policy",
      privacy: "Privacy",
    },
    cta: { tryDemo: "Try demo", platform: "View platform" },
  },
} as const;

type Dictionary = (typeof dictionaries)[Locale];

const I18nContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void; t: Dictionary } | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");
  useEffect(() => {
    const stored = window.localStorage.getItem("vigo-locale") as Locale | null;
    if (stored && ["es", "gl", "en"].includes(stored)) setLocaleState(stored);
    document.documentElement.lang = locale;
  }, [locale]);
  function setLocale(l: Locale) {
    setLocaleState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("vigo-locale", l);
  }
  return (
    <I18nContext.Provider value={{ locale, setLocale, t: dictionaries[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("I18nProvider missing");
  return ctx;
}
