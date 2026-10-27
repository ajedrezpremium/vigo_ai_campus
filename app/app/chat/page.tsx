import { ChatInterface } from "@/components/chat-interface";
import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

export default async function AppChatPage() {
  const locale = await getLocale();
  const t = messages[locale].dashboard;

  return (
    <div className="py-6">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="text-2xl font-bold text-primary">{t.superagent}</h1>
      </div>
      <ChatInterface showDemoBanner={false} />
    </div>
  );
}
