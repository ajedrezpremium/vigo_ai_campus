"use client";
import { useState } from "react";

type Conversation = { id: string; title: string; updatedAt: string; messages: { length: number }[] };

export default function HistorialPage() {
  const [list] = useState<Conversation[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("vigo-demo-conversations");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Historial</h1>
      <ul className="mt-6 space-y-2">
        {list.length === 0 && <li className="text-muted-foreground">Sin conversaciones.</li>}
        {list.map((c) => (
          <li key={c.id} className="rounded-lg border p-4">
            <p className="font-medium">{c.title}</p>
            <p className="text-xs text-muted-foreground">
              {c.messages.length} mensajes · {new Date(c.updatedAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
