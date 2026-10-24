export const instant = false;

import { connection } from "next/server";
import { MessageSquareText } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ConversationsPage() {
  await connection();
  const viewer = await getViewer();
  const admin = getSupabaseAdminClient();
  let conversations: { id: string; title: string; locale: string; mode: string; created_at: string; user_id: string | null }[] = [];
  let messageCount = 0;

  if (admin && viewer.organizationId) {
    const { data } = await admin
      .from("conversations")
      .select("id, title, locale, mode, created_at, user_id")
      .eq("organization_id", viewer.organizationId)
      .order("created_at", { ascending: false })
      .limit(50);
    conversations = data ?? [];
    if (conversations.length) {
      const { count } = await admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", conversations.map((c) => c.id));
      messageCount = count ?? 0;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Conversaciones</h1>
        <p className="mt-1 text-sm text-slate-500">Historial persistente por organizaciÃ³n. Solo accesible para PAS y administraciÃ³n.</p>
      </div>

      <Card className="border-slate-200 bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareText className="h-4 w-4" /> {conversations.length} conversaciones Â· {messageCount} mensajes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              Sin conversaciones persistidas. Las consultas anÃ³nimas no se guardan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-medium">TÃ­tulo</th>
                    <th className="py-2 pr-4 font-medium">Idioma</th>
                    <th className="py-2 pr-4 font-medium">Modo</th>
                    <th className="py-2 pr-4 font-medium">Usuario</th>
                    <th className="py-2 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((conversation) => (
                    <tr key={conversation.id} className="border-b border-slate-100 last:border-0">
                      <td className="max-w-[320px] truncate py-3 pr-4 font-medium text-slate-800">{conversation.title}</td>
                      <td className="py-3 pr-4 uppercase text-slate-500">{conversation.locale}</td>
                      <td className="py-3 pr-4"><Badge variant="outline">{conversation.mode}</Badge></td>
                      <td className="py-3 pr-4 font-mono text-[11px] text-slate-500">{conversation.user_id?.slice(0, 8) ?? "anÃ³nimo"}</td>
                      <td className="py-3 text-slate-500">{new Date(conversation.created_at).toLocaleString("es-ES")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

