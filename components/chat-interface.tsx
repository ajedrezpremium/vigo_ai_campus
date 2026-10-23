"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Citation = { title: string; url: string; snippet: string };
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: string;
  citations?: Citation[];
  needsHuman?: boolean;
  suggestedTicket?: { category: string; summary: string } | null;
  createdAt: string;
};
type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
};

const STORAGE_KEY = "vigo-demo-conversations";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function saveConversations(list: Conversation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function ChatInterface({ showDemoBanner = true }: { showDemoBanner?: boolean }) {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const list = loadConversations();
    return list.length ? list[0].id : null;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversations, loading]);

  const active = conversations.find((c) => c.id === activeId) || null;

  function newConversation() {
    const c: Conversation = {
      id: crypto.randomUUID(),
      title: "Nueva conversación",
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setError(null);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    let convId = activeId;
    if (!convId) {
      const c: Conversation = {
        id: crypto.randomUUID(),
        title: trimmed.slice(0, 48),
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      setConversations((prev) => [c, ...prev]);
      convId = c.id;
      setActiveId(c.id);
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              title: c.messages.length === 0 ? trimmed.slice(0, 48) : c.title,
              messages: [...c.messages, userMsg],
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    );

    setInput("");
    setLoading(true);
    setError(null);
    setLastUserMessage(trimmed);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId: convId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en el chat");

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        agent: data.agent,
        citations: data.citations || [],
        needsHuman: data.needsHuman,
        suggestedTicket: data.suggestedTicket,
        createdAt: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: new Date().toISOString() }
            : c,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function retry() {
    if (!lastUserMessage) return;
    // remove last assistant? keep simple: resend
    await sendMessage(lastUserMessage);
  }

  async function requestHelp(msg: Message) {
    if (!msg.suggestedTicket) return;
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg.suggestedTicket),
      });
      const data = await res.json();
      const note: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Se ha creado una derivación (id: ${data.id}) para el servicio correspondiente. El equipo responsable revisará tu caso. Esta es una demo: no se envía a ningún servicio real.`,
        createdAt: new Date().toISOString(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, messages: [...c.messages, note] } : c,
        ),
      );
    } catch {
      setError("No se pudo crear la derivación");
    }
  }

  async function sendFeedback(msg: Message, rating: number) {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msg.id, rating }),
    });
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {showDemoBanner && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Demo independiente y no oficial. Fuentes ficticias etiquetadas. No se presentan solicitudes oficiales.
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <CardContent className="p-3">
            <Button className="w-full" onClick={newConversation}>
              Nueva conversación
            </Button>
            <ScrollArea className="mt-3 h-[420px]">
              <div className="space-y-1 pr-2">
                {conversations.length === 0 && (
                  <p className="px-2 text-sm text-muted-foreground">Sin historial todavía.</p>
                )}
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                      activeId === c.id && "bg-muted font-medium",
                    )}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex min-h-[520px] flex-col">
          <CardContent className="flex flex-1 flex-col p-4">
            <ScrollArea className="flex-1 pr-2" ref={scrollRef as never}>
              <div className="space-y-4">
                {(!active || active.messages.length === 0) && (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    Haz una consulta, por ejemplo: ¿Cómo me matriculo en un grado? o ¿Qué becas puedo pedir?.
                  </div>
                )}
                {active?.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/60 text-foreground",
                      )}
                    >
                      {m.role === "assistant" && m.agent && (
                        <Badge variant="secondary" className="mb-2">
                          {m.agent}
                        </Badge>
                      )}
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                        <div className="mt-3 border-t border-border/50 pt-2">
                          <p className="text-xs font-medium">Fuentes</p>
                          <ul className="mt-1 space-y-1">
                            {m.citations.map((c, i) => (
                              <li key={i} className="text-xs">
                                <a
                                  href={c.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary underline"
                                >
                                  {c.title}
                                </a>
                                <span className="text-muted-foreground"> — {c.snippet.slice(0, 120)}…</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {m.role === "assistant" && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyText(m.content)}
                          >
                            Copiar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => sendFeedback(m, 5)}>
                            Útil
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => sendFeedback(m, 2)}>
                            Mejorar
                          </Button>
                          {m.needsHuman && m.suggestedTicket && (
                            <Button size="sm" onClick={() => requestHelp(m)}>
                              Solicitar ayuda
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                      Consultando fuentes y agentes…
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {error && (
              <div className="mt-3 flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={retry}>
                  Reintentar
                </Button>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Escribe tu consulta…"
                className="min-h-[44px] resize-none"
              />
              <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
