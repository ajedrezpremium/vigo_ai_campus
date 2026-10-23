import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FloatingAgent } from "@/components/floating-agent";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VIGO AI CAMPUS — Un campus. Un superagente. Todos los servicios.",
  description:
    "Plataforma demo de coordinación de servicios universitarios mediante un superagente de IA con fuentes verificables.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <I18nProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <FloatingAgent />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
