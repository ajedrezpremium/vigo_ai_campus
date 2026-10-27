/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: "user" | "assistant"; content: string; citations?: { title: string; url: string }[] };

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function FloatingAgent() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // drag
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // voice
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const [supportedTTS, setSupportedTTS] = useState(false);
  const [supportedSTT, setSupportedSTT] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupportedTTS("speechSynthesis" in window);
    const w = window as unknown as Record<string, unknown>;
    const SR = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => unknown) | undefined;
    setSupportedSTT(!!SR);
    if ("speechSynthesis" in window) {
      const load = () => {
        const vs = window.speechSynthesis.getVoices();
        setVoices(vs);
        if (vs.length) {
          const es = vs.find((v) => v.lang.startsWith("es")) || vs[0];
          setVoiceURI((prev) => prev || es.voiceURI);
        }
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }
    if (SR) {
      const rec = new (SR as new () => SpeechRec)();
      rec.lang = "es-ES";
      rec.interimResults = false;
      rec.onresult = (e) => {
        const t = e.results[0][0].transcript;
        setInput((prev) => (prev ? prev + " " : "") + t);
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  function startDrag(e: React.PointerEvent) {
    if (expanded) return;
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onDrag(e: React.PointerEvent) {
    if (!dragging.current) return;
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  }
  function stopDrag() {
    dragging.current = false;
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      const asst: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        citations: data.citations,
      };
      setMessages((m) => [...m, asst]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function speak(text: string) {
    if (!supportedTTS) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find((x) => x.voiceURI === voiceURI);
    if (v) u.voice = v;
    u.lang = v?.lang || "es-ES";
    u.rate = 1;
    window.speechSynthesis.speak(u);
  }

  function toggleListen() {
    if (!supportedSTT || !recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {}
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function share(text: string) {
    if (navigator.share) {
      navigator.share({ title: "VIGO AI CAMPUS", text }).catch(() => {});
    } else {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}`;
      window.open(url, "_blank");
    }
  }

  const panelStyle = expanded
    ? { inset: 0, width: "100vw", height: "100vh", transform: "none", borderRadius: 0 }
    : { right: 16, bottom: 16, transform: `translate(${pos.x}px, ${pos.y}px)` };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          lang="es"
          title="Super Agente IA"
          className="group fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary via-cyan-500 to-indigo-600 text-white shadow-[0_12px_32px_rgba(37,99,235,0.5)] ring-4 ring-white/40 transition-all hover:scale-110 hover:shadow-[0_16px_40px_rgba(37,99,235,0.6)]"
          aria-label="Super Agente IA"
        >
          <Sparkles aria-hidden="true" className="h-7 w-7 drop-shadow-md" />
          <span className="pointer-events-none absolute -top-10 right-0 whitespace-nowrap rounded-lg bg-foreground px-3 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Super Agente IA
          </span>
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-cyan-500" />
          </span>
        </button>
      )}
      {open && (
        <div
          ref={panelRef}
          lang="es"
          className={cn(
            "fixed z-50 flex flex-col border bg-background shadow-2xl",
            expanded ? "rounded-none" : "rounded-2xl",
          )}
          style={panelStyle as React.CSSProperties}
        >
          <div
            onPointerDown={startDrag}
            onPointerMove={onDrag}
            onPointerUp={stopDrag}
            className="flex cursor-move items-center justify-between border-b bg-primary px-4 py-2 text-primary-foreground"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">VIGO AI Campus Agent</span>
              <Badge variant="secondary" className="text-xs">Demo</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary/80" onClick={() => setExpanded((e) => !e)}>
                {expanded ? "Salir" : "Pantalla completa"}
              </Button>
              <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary/80" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b px-3 py-2 text-xs">
            <span>Voz:</span>
            <select
              className="h-7 rounded border bg-background px-1 text-xs"
              value={voiceURI}
              onChange={(e) => setVoiceURI(e.target.value)}
              disabled={!supportedTTS}
            >
              {voices
                .filter((v) => v.lang.startsWith("es") || v.lang.startsWith("en"))
                .map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
            </select>
            {supportedSTT && (
              <Button size="sm" variant={listening ? "default" : "outline"} onClick={toggleListen}>
                {listening ? "Escuchando…" : "Voz a texto"}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: expanded ? "calc(100vh - 140px)" : 320, maxHeight: expanded ? "none" : 360 }}>
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Hola. Pregunta sobre matrícula, becas, calendario o servicios. Puedes escribir o usar voz.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.role === "assistant" && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" onClick={() => speak(m.content)}>Leer</Button>
                      <Button size="sm" variant="ghost" onClick={() => copy(m.content)}>Copiar</Button>
                      <Button size="sm" variant="ghost" onClick={() => share(m.content)}>Compartir</Button>
                    </div>
                  )}
                  {m.citations && m.citations.length > 0 && (
                    <ul className="mt-2 text-xs text-muted-foreground">
                      {m.citations.map((c, i) => (
                        <li key={i}>
                          <a href={c.url} target="_blank" rel="noreferrer" className="underline">{c.title}</a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="text-sm text-muted-foreground">Consultando…</div>}
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>

          <div className="flex gap-2 border-t p-3">
            <textarea
              className="min-h-[40px] flex-1 resize-none rounded-md border bg-background px-2 py-1 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Escribe tu consulta…"
            />
            <Button onClick={send} disabled={loading || !input.trim()}>Enviar</Button>
          </div>
        </div>
      )}
    </>
  );
}
