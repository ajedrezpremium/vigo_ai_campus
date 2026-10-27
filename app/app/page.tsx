import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function AppDashboard() {
  const locale = await getLocale();
  const t = messages[locale].dashboard;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">{t.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.subtitle}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">{t.chat}</CardTitle></CardHeader>
          <CardContent><Button render={<Link href="/app/chat" />}>{t.chatText}</Button></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t.history}</CardTitle></CardHeader>
          <CardContent><Button render={<Link href="/historial" />} variant="outline">{t.historyText}</Button></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t.requests}</CardTitle></CardHeader>
          <CardContent><Button render={<Link href="/solicitudes" />} variant="outline">{t.requestsText}</Button></CardContent>
        </Card>
      </div>
    </div>
  );
}
