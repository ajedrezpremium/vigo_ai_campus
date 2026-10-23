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

export async function callLLM(params: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<LLMResult> {
  const provider = process.env.LLM_PROVIDER || "openrouter";
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "openrouter/free";
  const maxTokens = params.maxTokens ?? Number(process.env.AI_MAX_OUTPUT_TOKENS || 900);

  if (!apiKey) {
    throw new Error("LLM_API_KEY no configurada");
  }

  if (provider !== "openrouter") {
    throw new Error(`Proveedor LLM no soportado: ${provider}`);
  }

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
      throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = await res.json();
    const parsed = ResponseSchema.parse(json);
    const content = parsed.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("Respuesta LLM vacía");

    return {
      content,
      model: parsed.model || model,
      inputTokens: parsed.usage?.prompt_tokens,
      outputTokens: parsed.usage?.completion_tokens,
    };
  } finally {
    clearTimeout(timeout);
  }
}
