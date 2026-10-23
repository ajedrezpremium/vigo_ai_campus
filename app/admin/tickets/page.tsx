"use client";
import { useEffect, useState } from "react";
export default function Page() {
  const [list, setList] = useState<{ id: string; summary: string; status: string }[]>([]);
  useEffect(() => {
    fetch("/api/tickets")
      .then((r) => r.json())
      .then(setList)
      .catch(() => {});
  }, []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-primary">Tickets (demo)</h1>
      <ul className="mt-4 space-y-2">
        {list.map((t) => (
          <li key={t.id} className="rounded border p-3 text-sm">
            {t.summary} — {t.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
