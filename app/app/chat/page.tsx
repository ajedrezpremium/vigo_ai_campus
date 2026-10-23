import { ChatInterface } from "@/components/chat-interface";

export default function AppChatPage() {
  return (
    <div className="py-6">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="text-2xl font-bold text-primary">Superagente</h1>
      </div>
      <ChatInterface showDemoBanner={false} />
    </div>
  );
}
