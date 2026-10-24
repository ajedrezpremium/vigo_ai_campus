"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Bot, Check, Copy, ExternalLink, FileText, Plus, Send, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Citation = {
  title: string;
  url: string;
  snippet: string;
  type?: "official" | "demo";
  organization?: string;
  reviewedAt?: string;
};
type Notice = { code: string; message: string; quotaResetAt?: string };
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: string;
  citations?: Citation[];
  needsHuman?: boolean;
  suggestedTicket?: { category: string; summary: string } | null;
  notice?: Notice | null;
  aiGenerated?: boolean;
  confidence?: number;
  createdAt: string;
};
type Conversation = { id: string; title: string; messages: Message[]; updatedAt: string };

const STORAGE_KEY = "vigo-conversations-v2";

const COPY = {
  es: {
    newChat: "Nueva conversación",
    noHistory: "Sin historial todavía.",
    empty: "Haz una consulta sobre matrícula, becas, calendario, movilidad o servicios del campus.",
    placeholder: "Escribe tu consulta… (Enter para enviar, Shift+Enter para nueva línea)",
    send: "Enviar",
    thinking: "Consultando fuentes oficiales…",
    online: "Fuentes oficiales conectadas",
    sources: "Fuentes",
    official: "Oficial",
    demo: "Demo",
    copy: "Copiar",
    copied: "Copiado",
    helpful: "Útil",
    improve: "Mejorar",
    help: "Solicitar ayuda",
    error: "No se pudo completar la consulta.",
    retry: "Reintentar",
    chars: "caracteres",
    examples: [
      "¿Cómo me matriculo en un grado?",
      "¿Qué becas puedo solicitar?",
      "¿Cuándo empieza el curso 2026/2027?",
      "¿Qué trámites puedo hacer en la secretaría virtual?",
    ],
    ticketCreated: "Derivación creada",
    ticketNote: "El equipo responsable revisará tu caso. Esta demo no envía la solicitud a ningún servicio real.",
  },
  gl: {
    newChat: "Nova conversación",
    noHistory: "Sen historial aínda.",
    empty: "Fai unha consulta sobre matrícula, bolsas, calendario, mobilidade ou servizos do campus.",
    placeholder: "Escribe a túa consulta… (Enter para enviar, Shift+Enter para nova liña)",
    send: "Enviar",
    thinking: "Consultando fontes oficiais…",
    online: "Fontes oficiais conectadas",
    sources: "Fontes",
    official: "Oficial",
    demo: "Demo",
    copy: "Copiar",
    copied: "Copiado",
    helpful: "Útil",
    improve: "Mellorar",
    help: "Solicitar axuda",
    error: "Non se puido completar a consulta.",
    retry: "Reintentar",
    chars: "caracteres",
    examples: [
      "¿Como me matriculo nun grao?",
      "¿Que bolsas podo solicitar?",
      "¿Cando comeza o curso 2026/2027?",
      "¿Que trámites podo facer na secretaría virtual?",
    ],
    ticketCreated: "Derivación creada",
    ticketNote: "O equipo responsable revisará o teu caso. Esta demo non envía a solicitude a ningún servizo real.",
  },
  en: {
    newChat: "New conversation",
    noHistory: "No history yet.",
    empty: "Ask about enrolment, scholarships, calendars, mobility or campus services.",
    placeholder: "Type your question… (Enter to send, Shift+Enter for a new line)",
    send: "Send",
    thinking: "Checking official sources…",
    online: "Official sources connected",
    sources: "Sources",
    official: "Official",
    demo: "Demo",
    copy: "Copy",
    copied: "Copied",
    helpful: "Helpful",
    improve: "Improve",
    help: "Request help",
    error: "The request could not be completed.",
    retry: "Retry",
    chars: "characters",
    examples: [
      "How do I enrol in a degree?",
      "Which scholarships can I apply for?",
      "When does the 2026/2027 academic year start?",
      "What can I do in the virtual registry?",
    ],
    ticketCreated: "Referral created",
    ticketNote: "The responsible team will review your case. This demo does not send the request to a real service.",
  },
} as const;

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
  const { locale } = useI18n();
  const copy = COPY[locale];
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const list = loadConversations();
    return list.length ? list[0].id : null;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversations, loading]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);

  function newConversation() {
    const c: Conversation = { id: crypto.randomUUID(), title: copy.newChat, messages: [], updatedAt: new Date().toISOString() };
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setError(null);
    setInput("");
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (trimmed.length > 2000) {
      setError("La consulta supera el máximo de 2.000 caracteres.");
      return;
    }

    let convId = activeId;
    if (!convId) {
      const c: Conversation = { id: crypto.randomUUID(), title: trimmed.slice(0, 48), messages: [], updatedAt: new Date().toISOString() };
      setConversations((prev) => [c, ...prev]);
      convId = c.id;
      setActiveId(c.id);
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed, createdAt: new Date().toISOString() };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, title: c.messages.length === 0 ? trimmed.slice(0, 48) : c.title, messages: [...c.messages, userMsg], updatedAt: new Date().toISOString() }
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
        body: JSON.stringify({ message: trimmed, conversationId: convId, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || copy.error);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        agent: data.agent,
        citations: data.citations || [],
        needsHuman: data.needsHuman,
        suggestedTicket: data.suggestedTicket,
        notice: data.notice ?? null,
        aiGenerated: data.aiGenerated,
        confidence: data.confidence,
        createdAt: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: new Date().toISOString() } : c)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.error);
    } finally {
      setLoading(false);
    }
  }

  async function retry() {
    if (!lastUserMessage) return;
    await sendMessage(lastUserMessage);
  }

  async function requestHelp(msg: Message) {
    if (!msg.suggestedTicket) return;
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...msg.suggestedTicket, conversationId: activeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear la derivación");
      const note: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `${copy.ticketCreated}: ${data.id}\n\n${copy.ticketNote}`,
        createdAt: new Date().toISOString(),
      };
      setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, note] } : c)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la derivación");
    }
  }

  async function sendFeedback(msg: Message, rating: number) {
    setFeedback((prev) => ({ ...prev, [msg.id]: rating >= 4 ? "up" : "down" }));
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msg.id, rating }),
    }).catch(() => {});
  }

  async function copyText(msg: Message) {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(msg.id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      // El portapapeles puede estar bloqueado por el navegador.
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {showDemoBanner && (
        <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
          Demo independiente y no oficial. Las fuentes oficiales están enlazadas; las fuentes demo se etiquetan como tales. No se presentan solicitudes oficiales.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        <Card className="hidden h-fit lg:block">
          <CardContent className="p-3">
            <Button className="w-full" onClick={newConversation}>
              <Plus className="mr-2 h-4 w-4" /> {copy.newChat}
            </Button>
            <ScrollArea className="mt-3 h-[420px]">
              <div className="space-y-1 pr-2">
                {conversations.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">{copy.noHistory}</p>}
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "w-full rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      activeId === c.id && "bg-muted font-medium",
                    )}
                  >
                    <span className="line-clamp-2">{c.title}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex min-h-[600px] flex-col border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-500 text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Superagente</p>
                <p className="text-[11px] text-emerald-600">● {copy.online}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={newConversation} className="lg:hidden">
              <Plus className="mr-1 h-3.5 w-3.5" /> {copy.newChat}
            </Button>
          </div>

          <CardContent className="flex flex-1 flex-col p-3 sm:p-4">
            <ScrollArea className="flex-1 pr-1 sm:pr-2" ref={scrollRef as never}>
              <div className="space-y-4" role="log" aria-live="polite" aria-relevant="additions text">
                {(!active || active.messages.length === 0) && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-700"><Sparkles className="h-4 w-4 text-cyan-600" /> {copy.empty}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {copy.examples.map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => sendMessage(example)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs text-slate-700 transition hover:border-cyan-300 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {active?.messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[92%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[85%]",
                        m.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-slate-50 text-slate-800",
                      )}
                    >
                      {m.role === "assistant" && (
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          {m.agent && <Badge variant="secondary" className="text-[10px]">{m.agent}</Badge>}
                          {m.aiGenerated === false && <Badge variant="outline" className="text-[10px]">Fuentes verificadas</Badge>}
                        </div>
                      )}

                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

                      {m.notice && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{m.notice.message}</span>
                        </div>
                      )}

                      {m.role === "assistant" && !!m.citations?.length && (
                        <div className="mt-3 border-t border-slate-200 pt-2">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            <FileText className="h-3 w-3" /> {copy.sources} ({m.citations.length})
                          </p>
                          <ul className="mt-1.5 space-y-1.5">
                            {m.citations.map((c, i) => (
                              <li key={`${c.url}-${i}`} className="text-xs">
                                <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 font-medium text-primary underline-offset-2 hover:underline">
                                  <span className="line-clamp-2">{c.title}</span>
                                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                                </a>
                                <span className={cn("ml-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase", c.type === "demo" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                                  {c.type === "demo" ? copy.demo : copy.official}
                                </span>
                                <span className="mt-0.5 block text-slate-500">{c.snippet.slice(0, 150)}…</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {m.role === "assistant" && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => copyText(m)} aria-label={copy.copy}>
                            {copied === m.id ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                            {copied === m.id ? copy.copied : copy.copy}
                          </Button>
                          <Button
                            variant={feedback[m.id] === "up" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => sendFeedback(m, 5)}
                            aria-pressed={feedback[m.id] === "up"}
                          >
                            <ThumbsUp className="mr-1 h-3.5 w-3.5" /> {copy.helpful}
                          </Button>
                          <Button
                            variant={feedback[m.id] === "down" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => sendFeedback(m, 2)}
                            aria-pressed={feedback[m.id] === "down"}
                          >
                            <ThumbsDown className="mr-1 h-3.5 w-3.5" /> {copy.improve}
                          </Button>
                          {m.needsHuman && m.suggestedTicket && (
                            <Button size="sm" onClick={() => requestHelp(m)}>
                              {copy.help}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start" aria-live="polite">
                    <div className="rounded-2xl rounded-bl-md bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 animate-ping rounded-full bg-cyan-500" />
                        {copy.thinking}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {error && (
              <div role="alert" className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <span className="line-clamp-2">{error}</span>
                <Button variant="outline" size="sm" onClick={retry}>{copy.retry}</Button>
              </div>
            )}

            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder={copy.placeholder}
                  aria-label={copy.placeholder}
                  maxLength={2000}
                  className="min-h-[48px] resize-none"
                  disabled={loading}
                />
                <p className={cn("mt-1 text-right text-[10px]", input.length > 1900 ? "text-amber-600" : "text-slate-400")}>
                  {input.length}/2000 {copy.chars}
                </p>
              </div>
              <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="mb-5 h-12 px-4" aria-label={copy.send}>
                <Send className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{copy.send}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
