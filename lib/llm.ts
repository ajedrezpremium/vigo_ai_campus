import { z } from "zod";

export type LLMResult = {
  content: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
};

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

const DEFAULT_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "liquid/lfm-2.5-2.6b:free",
  "cohere/north-mini-code:free",
];

function getModelList() {
  const env = process.env.LLM_MODEL || "";
  const extra = process.env.LLM_MODELS || "";
  const list = [env, ...extra.split(",")]
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = [...new Set([...list, ...DEFAULT_MODELS])];
  return merged.length ? merged : DEFAULT_MODELS;
}

export async function callLLM(params: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<LLMResult> {
  const provider = process.env.LLM_PROVIDER || "openrouter";
  const apiKey = process.env.LLM_API_KEY;
  const maxTokens = params.maxTokens ?? Number(process.env.AI_MAX_OUTPUT_TOKENS || 900);
  const models = getModelList();

  if (!apiKey) {
    throw new Error("LLM_API_KEY no configurada");
  }

  if (provider !== "openrouter") {
    throw new Error(`Proveedor LLM no soportado: ${provider}`);
  }

  let lastError = "sin modelos";
  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "VIGO AI CAMPUS Demo",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
          max_tokens: maxTokens,
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        lastError = `LLM HTTP ${res.status}: ${text.slice(0, 200)}`;
        // try next model on rate limit / unavailable / server errors
        if (res.status === 429 || res.status === 404 || res.status >= 500) {
          continue;
        }
        throw new Error(lastError);
      }

      const json = await res.json();
      const parsed = ResponseSchema.parse(json);
      const content = parsed.choices[0]?.message?.content?.trim();
      if (!content) {
        lastError = "Respuesta LLM vacía";
        continue;
      }

      return {
        content,
        model: parsed.model || model,
        inputTokens: parsed.usage?.prompt_tokens,
        outputTokens: parsed.usage?.completion_tokens,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "error desconocido";
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(lastError);
}
