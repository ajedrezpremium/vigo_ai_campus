/**
 * Clave y acceso al historial local del chat.
 *
 * La usan tanto `components/chat-interface.tsx` (escritura) como
 * `app/historial/page.tsx` (lectura). Mantenerla en un único sitio evita
 * que las dos vistas se desincronicen.
 */
export const CHAT_STORAGE_KEY = "vigo-conversations-v2";

export type StoredConversation = {
  id: string;
  title: string;
  messages: unknown[];
  updatedAt: string;
};

const EMPTY: StoredConversation[] = [];

let cachedRaw: string | null | undefined;
let cached: StoredConversation[] = EMPTY;

function parseConversations(raw: string | null): StoredConversation[] {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const valid = parsed.filter(
      (item): item is StoredConversation =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        Array.isArray(item.messages),
    );
    return valid.length ? valid : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function loadStoredConversations(): StoredConversation[] {
  if (typeof window === "undefined") return EMPTY;
  return parseConversations(window.localStorage.getItem(CHAT_STORAGE_KEY));
}

/** Snapshot estable para `useSyncExternalStore`. */
export function getConversationsSnapshot(): StoredConversation[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = parseConversations(raw);
  return cached;
}

export function getServerConversationsSnapshot(): StoredConversation[] {
  return EMPTY;
}

/** Suscripción a cambios de historial (otra pestaña o guardado local). */
export function subscribeConversations(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === CHAT_STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("vigo:conversations", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("vigo:conversations", callback);
  };
}

/** Avisa a las vistas suscritas tras guardar en localStorage. */
export function notifyConversationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("vigo:conversations"));
}
