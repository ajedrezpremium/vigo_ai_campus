import { z } from "zod";

export type LLMResult = {
  content: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  attempts: number;
};

export type LLMQuota = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  freeTier: boolean;
};

export class LLMQuotaExceededError extends Error {
  constructor(public quota: LLMQuota) {
    super("Cuota diaria de modelos gratuitos de OpenRouter agotada");
    this.name = "LLMQuotaExceededError";
  }
}

export class LLMNotConfiguredError extends Error {
  constructor() {
    super("LLM_API_KEY no configurada");
    this.name = "LLMNotConfiguredError";
  }
}

const ResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    }),
  ),
  model: z.string().optional(),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
    })
    .optional(),
});

const KeyInfoSchema = z.object({
  data: z.object({
    label: z.string().optional(),
    is_free_tier: z.boolean().optional(),
    usage: z.number().optional(),
    free_model_daily_requests: z
      .object({
        used: z.number(),
        limit: z.number(),
        remaining: z.number(),
      })
      .optional(),
  }),
});

/**
 * Modelos gratuitos verificados contra /api/v1/models el 2026-10-24.
 * El orden prioriza calidad en español e instrucciones.
 * Puede sobreescribirse con LLM_MODEL / LLM_MODELS.
 */
const DEFAULT_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "thinkingmachines/inkling:free",
  "xingchen-agi/xing4.0-29b-a4b:free",
  "openrouter/free",
];

const globalCache = globalThis as typeof globalThis & {
  __vigoLLM?: {
    quota?: { value: LLMQuota; expiresAt: number };
    status?: { value: LLMStatus; expiresAt: number };
    lastError?: string;
    lastSuccess?: { model: string; at: string };
    calls: number;
  };
};

const cache = (globalCache.__vigoLLM ??= { calls: 0 });

export type LLMStatus = {
  configured: boolean;
  provider: string;
  keyLabel: string | null;
  freeTier: boolean | null;
  quota: LLMQuota | null;
  quotaExhausted: boolean;
  models: string[];
  lastError: string | null;
  lastSuccess: { model: string; at: string } | null;
  calls: number;
};

function getModelList() {
  const primary = process.env.LLM_MODEL || "";
  const extra = process.env.LLM_MODELS || "";
  const list = [primary, ...extra.split(",")]
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...list, ...DEFAULT_MODELS])];
}

function nextUtcMidnight() {
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return reset.toISOString();
}

function apiKey() {
  return process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || "";
}

export function getProviderName() {
  return process.env.LLM_PROVIDER || "openrouter";
}

export async function getLLMQuota(force = false): Promise<LLMQuota | null> {
  const key = apiKey();
  if (!key) return null;
  const now = Date.now();
  if (!force && cache.quota && cache.quota.expiresAt > now) return cache.quota.value;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return cache.quota?.value ?? null;
    const parsed = KeyInfoSchema.parse(await res.json());
    const free = parsed.data.free_model_daily_requests;
    const quota: LLMQuota = {
      limit: free?.limit ?? (parsed.data.is_free_tier ? 50 : 1000),
      used: free?.used ?? 0,
      remaining: free?.remaining ?? 0,
      resetAt: nextUtcMidnight(),
      freeTier: parsed.data.is_free_tier ?? false,
    };
    cache.quota = { value: quota, expiresAt: now + 60_000 };
    return quota;
  } catch {
    return cache.quota?.value ?? null;
  }
}

export async function getLLMStatus(force = false): Promise<LLMStatus> {
  const key = apiKey();
  const now = Date.now();
  if (!force && cache.status && cache.status.expiresAt > now) return cache.status.value;

  const quota = await getLLMQuota(force);
  let keyLabel: string | null = null;
  let freeTier: boolean | null = null;
  if (key) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (res.ok) {
        const parsed = KeyInfoSchema.parse(await res.json());
        keyLabel = parsed.data.label ?? "clave configurada";
        freeTier = parsed.data.is_free_tier ?? null;
      }
    } catch {
      // El estado se muestra igualmente con la información en caché.
    }
  }

  const status: LLMStatus = {
    configured: Boolean(key),
    provider: getProviderName(),
    keyLabel,
    freeTier,
    quota,
    quotaExhausted: Boolean(quota && quota.remaining <= 0),
    models: getModelList(),
    lastError: cache.lastError ?? null,
    lastSuccess: cache.lastSuccess ?? null,
    calls: cache.calls,
  };
  cache.status = { value: status, expiresAt: now + 30_000 };
  return status;
}

function isDailyQuotaError(status: number, body: string) {
  return status === 429 && /free-models-per-day|free model|daily/i.test(body);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callLLM(params: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<LLMResult> {
  const provider = getProviderName();
  const key = apiKey();
  const maxTokens = params.maxTokens ?? Number(process.env.AI_MAX_OUTPUT_TOKENS || 900);
  const models = getModelList();

  if (!key) throw new LLMNotConfiguredError();
  if (provider !== "openrouter") {
    throw new Error(`Proveedor LLM no soportado: ${provider}`);
  }

  const quota = await getLLMQuota();
  if (quota && quota.remaining <= 0 && process.env.LLM_SKIP_ON_QUOTA !== "false") {
    throw new LLMQuotaExceededError(quota);
  }

  let lastError = "sin modelos disponibles";
  let attempts = 0;

  for (const model of models) {
    attempts += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35_000);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://vigo-ai-campus.vercel.app",
          "X-Title": "VIGO AI CAMPUS",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
          max_tokens: maxTokens,
          temperature: 0.15,
          top_p: 0.9
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        lastError = `HTTP ${res.status}: ${text.slice(0, 220)}`;
        if (isDailyQuotaError(res.status, text)) {
          const refreshed = await getLLMQuota(true);
          cache.lastError = "Cuota diaria de modelos gratuitos agotada";
          throw new LLMQuotaExceededError(
            refreshed ?? quota ?? { limit: 50, used: 50, remaining: 0, resetAt: nextUtcMidnight(), freeTier: true },
          );
        }
        if (res.status === 429) {
          await sleep(1200);
          continue;
        }
        if (res.status === 404 || res.status >= 500) continue;
        throw new Error(lastError);
      }

      const parsed = ResponseSchema.parse(await res.json());
      const content = parsed.choices[0]?.message?.content?.trim();
      if (!content) {
        lastError = "Respuesta vacía del modelo";
        continue;
      }

      cache.calls += 1;
      cache.lastError = undefined;
      cache.lastSuccess = { model: parsed.model || model, at: new Date().toISOString() };
      cache.status = undefined;
      return {
        content,
        model: parsed.model || model,
        inputTokens: parsed.usage?.prompt_tokens,
        outputTokens: parsed.usage?.completion_tokens,
        attempts,
      };
    } catch (err) {
      if (err instanceof LLMQuotaExceededError) throw err;
      lastError = err instanceof Error ? err.message : "error desconocido";
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  cache.lastError = lastError.slice(0, 240);
  throw new Error(lastError);
}

/**
 * Variante en streaming compatible con OpenRouter (SSE). Si un modelo falla
 * antes de emitir texto se prueba el siguiente; si falla después, se propaga
 * el error para no mezclar dos respuestas. El llamador decide el fallback
 * extractivo.
 */
export async function callLLMStream(
  params: { system: string; user: string; maxTokens?: number },
  onDelta: (text: string) => void,
): Promise<LLMResult> {
  const provider = getProviderName();
  const key = apiKey();
  const maxTokens = params.maxTokens ?? Number(process.env.AI_MAX_OUTPUT_TOKENS || 900);
  const models = getModelList();

  if (!key) throw new LLMNotConfiguredError();
  if (provider !== "openrouter") throw new Error(`Proveedor LLM no soportado: ${provider}`);

  const quota = await getLLMQuota();
  if (quota && quota.remaining <= 0 && process.env.LLM_SKIP_ON_QUOTA !== "false") {
    throw new LLMQuotaExceededError(quota);
  }

  let lastError = "sin modelos disponibles";
  let attempts = 0;

  for (const model of models) {
    attempts += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    let produced = false;
    let content = "";
    let usedModel = model;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://vigo-ai-campus.vercel.app",
          "X-Title": "VIGO AI CAMPUS",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
          max_tokens: maxTokens,
          temperature: 0.15,
          top_p: 0.9,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        lastError = `HTTP ${res.status}: ${text.slice(0, 220)}`;
        if (isDailyQuotaError(res.status, text)) {
          const refreshed = await getLLMQuota(true);
          cache.lastError = "Cuota diaria de modelos gratuitos agotada";
          throw new LLMQuotaExceededError(
            refreshed ?? quota ?? { limit: 50, used: 50, remaining: 0, resetAt: nextUtcMidnight(), freeTier: true },
          );
        }
        if (res.status === 429) {
          await sleep(1200);
          continue;
        }
        if (res.status === 404 || res.status >= 500) continue;
        throw new Error(lastError);
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        // Algunos despliegues ignoran `stream`; se acepta la respuesta JSON.
        const parsed = ResponseSchema.parse(await res.json());
        const text = parsed.choices[0]?.message?.content?.trim();
        if (!text) {
          lastError = "Respuesta vacía del modelo";
          continue;
        }
        onDelta(text);
        content = text;
        produced = true;
        usedModel = parsed.model || model;
        inputTokens = parsed.usage?.prompt_tokens;
        outputTokens = parsed.usage?.completion_tokens;
      } else {
        const reader = res.body?.getReader();
        if (!reader) {
          lastError = "Respuesta sin cuerpo en streaming";
          continue;
        }
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;

            let payload: {
              model?: string;
              usage?: { prompt_tokens?: number; completion_tokens?: number };
              error?: { message?: string };
              choices?: { delta?: { content?: string | null } }[];
            };
            try {
              payload = JSON.parse(data);
            } catch {
              continue;
            }
            if (payload.error) throw new Error(payload.error.message ?? "error en streaming");
            if (payload.model) usedModel = payload.model;
            if (payload.usage) {
              inputTokens = payload.usage.prompt_tokens ?? inputTokens;
              outputTokens = payload.usage.completion_tokens ?? outputTokens;
            }
            const delta = payload.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              produced = true;
              content += delta;
              onDelta(delta);
            }
          }
        }
      }

      if (!content.trim()) {
        lastError = "Respuesta vacía del modelo";
        continue;
      }

      cache.calls += 1;
      cache.lastError = undefined;
      cache.lastSuccess = { model: usedModel, at: new Date().toISOString() };
      cache.status = undefined;
      return { content, model: usedModel, inputTokens, outputTokens, attempts };
    } catch (err) {
      if (err instanceof LLMQuotaExceededError) throw err;
      lastError = err instanceof Error ? err.message : "error desconocido";
      if (produced) throw new Error(`stream interrumpido: ${lastError}`);
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  cache.lastError = lastError.slice(0, 240);
  throw new Error(lastError);
}

