import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FloatingAgent } from "@/components/floating-agent";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// El layout raíz lee la cookie de idioma para renderizar `<html lang>`.
// Con Cache Components hay que permitir explícitamente que bloquee.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return messages[locale].meta;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const t = messages[locale];

  return (
    <html lang={locale} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a href="#contenido-principal" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">{t.common.skipToContent}</a>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <I18nProvider initialLocale={locale}>
            <SiteHeader />
            <main id="contenido-principal" className="flex-1">{children}</main>
            <SiteFooter />
            <FloatingAgent />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
