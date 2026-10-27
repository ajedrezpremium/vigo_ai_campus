"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type Ticket = {
  id: string;
  summary: string;
  category: string;
  status: string;
  createdAt?: string;
  created_at?: string;
};

export default function SolicitudesPage() {
  const { t, locale } = useI18n();
  const copy = t.requests;
  const [list, setList] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/tickets")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(res.status === 403 ? copy.loginRequired : (data?.error ?? copy.loadError));
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        const rows = Array.isArray(data) ? data : Array.isArray(data?.tickets) ? data.tickets : [];
        setList(rows);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : copy.loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [copy.loginRequired, copy.loadError]);

  const dateLocale = locale === "en" ? "en-GB" : locale === "gl" ? "gl-ES" : "es-ES";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <Link
          href="/app/chat"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t.common.openAgent}
        </Link>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.common.loading}</p>
      ) : error ? (
        <div role="alert" className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}{" "}
          <Link href="/login?next=/solicitudes" className="font-medium underline">
            {t.common.login}
          </Link>
        </div>
      ) : list.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">{copy.empty}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.emptyHint}</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {list.map((ticket) => {
            const value = ticket.createdAt ?? ticket.created_at;
            return (
              <li key={ticket.id} className="rounded-lg border p-4">
                <p className="font-medium">{ticket.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {ticket.category} · {ticket.status} ·{" "}
                  {value ? new Date(value).toLocaleString(dateLocale) : copy.noDate}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
