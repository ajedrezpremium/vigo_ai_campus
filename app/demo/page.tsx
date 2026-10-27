import { ChatInterface } from "@/components/chat-interface";
import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function DemoPage() {
  const locale = await getLocale();
  const t = messages[locale].demo;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-primary">{t.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.intro}</p>
      <div className="mt-6">
        <ChatInterface showDemoBanner />
      </div>
    </div>
  );
}
