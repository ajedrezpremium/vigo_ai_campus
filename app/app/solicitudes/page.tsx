"use client";
import { useEffect, useState } from "react";

type Ticket = { id: string; summary: string; category: string; status: string; createdAt: string };

export default function SolicitudesPage() {
  const [list, setList] = useState<Ticket[]>([]);
  useEffect(() => {
    fetch("/api/tickets")
      .then((r) => r.json())
      .then((data: Ticket[]) => setList(data))
      .catch(() => {});
  }, []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary">Solicitudes y derivaciones</h1>
      <ul className="mt-6 space-y-2">
        {list.length === 0 && <li className="text-muted-foreground">Sin derivaciones todavía.</li>}
        {list.map((t) => (
          <li key={t.id} className="rounded-lg border p-4">
            <p className="font-medium">{t.summary}</p>
            <p className="text-xs text-muted-foreground">
              {t.category} · {t.status} · {new Date(t.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
