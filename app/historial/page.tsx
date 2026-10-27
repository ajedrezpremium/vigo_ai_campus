"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getConversationsSnapshot,
  getServerConversationsSnapshot,
  subscribeConversations,
} from "@/lib/chat-storage";
import { useI18n } from "@/lib/i18n";

function dateLocale(locale: string) {
  return locale === "en" ? "en-GB" : locale === "gl" ? "gl-ES" : "es-ES";
}

export default function HistorialPage() {
  const { t, locale } = useI18n();
  const copy = t.history;
  const list = useSyncExternalStore(
    subscribeConversations,
    getConversationsSnapshot,
    getServerConversationsSnapshot,
  );

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

      {list.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">{copy.empty}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.emptyHint}</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {list.map((conversation) => (
            <li key={conversation.id} className="rounded-lg border p-4">
              <p className="font-medium">{conversation.title}</p>
              <p className="text-xs text-muted-foreground">
                {conversation.messages.length} {copy.messages} ·{" "}
                {conversation.updatedAt
                  ? new Date(conversation.updatedAt).toLocaleString(dateLocale(locale))
                  : copy.noDate}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
