import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyIntent, needsClarification } from "@/lib/agents";
import { retrieve, retrievalConfidence, topScore, type RetrievedChunk } from "@/lib/retrieval";
import { callLLM, callLLMStream, LLMQuotaExceededError } from "@/lib/llm";
import { composeGroundedAnswer } from "@/lib/answer-composer";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer, type Viewer } from "@/lib/auth";
import { inspectUserInput } from "@/lib/security";
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit";
import { recordMetric, recordSecurityEvent } from "@/lib/metrics";
import { requestIdFromHeaders } from "@/lib/observability/core";
import { reportServerError } from "@/lib/observability/server";
import { buildChatSystemPrompt, buildChatUserPrompt, CHAT_PROMPT_VERSION } from "@/lib/prompts";
import { shouldAbstain } from "@/lib/evidence";


const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  locale: z.enum(["es", "gl", "en"]).optional(),
  conversationId: z.string().uuid().optional(),
  stream: z.boolean().optional(),
});

type ChatLocale = "es" | "gl" | "en";
type Notice = { code: string; message: string; quotaResetAt?: string };
type Citation = {
  index: number;
  title: string;
  url: string;
  snippet: string;
  type: "official" | "demo";
  organization: string;
  reviewedAt: string;
};

type PreparedChat = {
  message: string;
  locale: ChatLocale;
  agent: string;
  chunks: RetrievedChunk[];
  effectiveChunks: RetrievedChunk[];
  citations: Citation[];
  system: string;
  user: string;
  hasEvidence: boolean;
  confidence: number;
  score: number;
  requestId: string;
  startedAt: number;
  rateHeaders: Record<string, string>;
  conversationId?: string;
  viewer: Viewer | null;
};

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

function buildPayload(input: {
  prepared: PreparedChat;
  content: string;
  model: string;
  aiGenerated: boolean;
  notice: Notice | null;
  needsHuman: boolean;
  conversationId?: string;
  persisted: boolean;
  noEvidence: boolean;
}) {
  const { prepared } = input;
  const officialChunks = prepared.effectiveChunks.filter((c) => c.sourceType === "official");

  return {
    answer: input.content,
    agent: prepared.agent,
    model: input.model,
    aiGenerated: input.aiGenerated,
    notice: input.notice,
    citations: prepared.citations,
    needsHuman: input.needsHuman,
    confidence: Math.round(prepared.confidence * 100) / 100,
    promptVersion: CHAT_PROMPT_VERSION,
    sourceSummary: {
      total: prepared.effectiveChunks.length,
      official: officialChunks.length,
      demo: prepared.effectiveChunks.length - officialChunks.length,
    },
    conversationId: input.conversationId,
    persisted: input.persisted,
    organization: prepared.viewer?.organizationName ?? null,
    requestId: prepared.requestId,
    suggestedTicket: input.needsHuman
      ? {
          category: prepared.agent === "admin-agent" ? "tramite" : "informacion",
          summary: prepared.message.slice(0, 180),
        }
      : null,
    noEvidence: input.noEvidence,
  };
}

async function persistExchange(input: {
  conversationId?: string;
  message: string;
  content: string;
  citations: Citation[];
  agent: string;
  locale: ChatLocale;
}) {
  let conversationId = input.conversationId;
  let persisted = false;

  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return { conversationId, persisted };

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return { conversationId, persisted };

    const { data: membership } = await supabase
      .from("memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const orgId = membership?.organization_id;
    if (!orgId) return { conversationId, persisted };

    if (!conversationId) conversationId = crypto.randomUUID();
    await supabase.from("conversations").upsert({
      id: conversationId,
      organization_id: orgId,
      user_id: user.id,
      title: input.message.slice(0, 48),
      locale: input.locale,
      mode: "authenticated",
    });
    await supabase.from("messages").insert([
      {
        organization_id: orgId,
        conversation_id: conversationId,
        role: "user",
        content: input.message,
        agent_slug: null,
      },
      {
        organization_id: orgId,
        conversation_id: conversationId,
        role: "assistant",
        content: input.content,
        citations: input.citations,
        agent_slug: input.agent,
      },
    ]);
    persisted = true;
  } catch {
    // La persistencia es best-effort en la demo; nunca bloquea la respuesta.
  }

  return { conversationId, persisted };
}

function recordChatMetric(input: {
  prepared: PreparedChat;
  model: string;
  inputTokens: number;
  outputTokens: number;
  needsHuman: boolean;
  noEvidence: boolean;
}) {
  recordMetric({
    id: input.prepared.requestId,
    timestamp: new Date().toISOString(),
    agent: input.prepared.agent,
    model: input.model,
    latencyMs: Date.now() - input.prepared.startedAt,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    resolved: !input.needsHuman && !input.noEvidence,
    escalated: input.needsHuman,
    citationCount: input.prepared.citations.length,
    officialCitationCount: input.prepared.effectiveChunks.filter((c) => c.sourceType === "official").length,
    locale: input.prepared.locale,
    organizationId: input.prepared.viewer?.organizationId ?? null,
  });
}

function streamChat(prepared: PreparedChat) {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };

      const emitText = (text: string) => {
        for (let i = 0; i < text.length; i += 72) {
          send({ type: "delta", text: text.slice(i, i + 72) });
        }
      };

      const preliminaryNeedsHuman = !prepared.hasEvidence || prepared.confidence < 0.34 || prepared.score < 1.2;
      send({
        type: "meta",
        agent: prepared.agent,
        citations: prepared.citations,
        needsHuman: preliminaryNeedsHuman,
        confidence: Math.round(prepared.confidence * 100) / 100,
        promptVersion: CHAT_PROMPT_VERSION,
        sourceSummary: {
          total: prepared.effectiveChunks.length,
          official: prepared.effectiveChunks.filter((c) => c.sourceType === "official").length,
          demo: prepared.effectiveChunks.filter((c) => c.sourceType !== "official").length,
        },
        conversationId: prepared.conversationId,
        organization: prepared.viewer?.organizationName ?? null,
        requestId: prepared.requestId,
      });

      let content = "";
      let model = "grounded-extractive-v1";
      let aiGenerated = false;
      let inputTokens = 0;
      let outputTokens = 0;
      let notice: Notice | null = null;

      try {
        if (!prepared.effectiveChunks.length) {
          const composed = composeGroundedAnswer({
            query: prepared.message,
            chunks: [],
            agent: prepared.agent,
            locale: prepared.locale,
            reason: "no_evidence",
          });
          content = composed.answer;
          model = "grounded-no-evidence";
          notice = { code: "no_evidence", message: composed.notice };
          send({ type: "notice", notice });
          emitText(content);
        } else {
          let produced = false;
          try {
            const result = await callLLMStream({ system: prepared.system, user: prepared.user }, (delta) => {
              produced = true;
              content += delta;
              send({ type: "delta", text: delta });
            });
            model = result.model;
            inputTokens = result.inputTokens ?? 0;
            outputTokens = result.outputTokens ?? 0;
            aiGenerated = true;
          } catch (err) {
            if (produced) {
              model = "llm-stream-interrupted";
              notice = {
                code: "stream_interrupted",
                message: "La respuesta se interrumpió antes de terminar. Puedes reintentar la consulta.",
              };
              send({ type: "notice", notice });
            } else {
              const quota = err instanceof LLMQuotaExceededError;
              const composed = composeGroundedAnswer({
                query: prepared.message,
                chunks: prepared.effectiveChunks,
                agent: prepared.agent,
                locale: prepared.locale,
                reason: quota ? "quota" : "unavailable",
                quotaResetAt: quota ? err.quota.resetAt : undefined,
              });
              content = composed.answer;
              model = "grounded-extractive-v1";
              notice = {
                code: quota ? "llm_quota" : "llm_unavailable",
                message: composed.notice,
                ...(quota ? { quotaResetAt: err.quota.resetAt } : {}),
              };
              send({ type: "notice", notice });
              emitText(content);
            }
          }
        }

        const noEvidence = /no (hay|se ha encontrado|tengo) (evidencia|información|fuentes)/i.test(content);
        const needsHuman =
          !prepared.hasEvidence || prepared.confidence < 0.34 || prepared.score < 1.2 || noEvidence;

        const persisted = await persistExchange({
          conversationId: prepared.conversationId,
          message: prepared.message,
          content,
          citations: prepared.citations,
          agent: prepared.agent,
          locale: prepared.locale,
        });

        recordChatMetric({ prepared, model, inputTokens, outputTokens, needsHuman, noEvidence });

        send({
          type: "done",
          ...buildPayload({
            prepared,
            content,
            model,
            aiGenerated,
            notice,
            needsHuman,
            conversationId: persisted.conversationId,
            persisted: persisted.persisted,
            noEvidence,
          }),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        await reportServerError({
          requestId: prepared.requestId,
          route: "/api/chat (stream)",
          method: "POST",
          message,
          organizationId: prepared.viewer?.organizationId ?? null,
          source: "route",
        });
        send({ type: "error", code: "internal_error", message: "No se pudo completar la consulta." });
      } finally {
        try {
          controller.close();
        } catch {
          closed = true;
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...prepared.rateHeaders,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Request-Id": prepared.requestId,
    },
  });
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const requestId = requestIdFromHeaders(req.headers);
  const identifier = getClientIdentifier(req);
  let viewer: Viewer | null = null;

  const burst = await checkRateLimitAsync(`chat:burst:${identifier}`, { limit: 8, windowMs: 60_000 });
  const dailyLimit = Number(process.env.AI_DAILY_REQUEST_LIMIT || 30);
  const daily = await checkRateLimitAsync(`chat:daily:${identifier}`, { limit: dailyLimit, windowMs: 86_400_000 });

  if (!burst.allowed || !daily.allowed) {
    const limited = !burst.allowed ? burst : daily;
    return json(
      {
        error: "Has alcanzado el límite de consultas. Inténtalo de nuevo más tarde.",
        code: "rate_limited",
        retryAfterSeconds: limited.retryAfterSeconds,
      },
      { status: 429, headers: { ...rateLimitHeaders(limited), "X-Request-Id": requestId } },
    );
  }

  try {
    const jsonBody = await req.json();
    const body = BodySchema.parse(jsonBody);

    const security = inspectUserInput(body.message);
    if (security.blocked) {
      recordSecurityEvent({
        reasons: security.reasons,
        path: "/api/chat",
        identifier,
      });
      return json(
        {
          error:
            "La consulta contiene instrucciones que no puedo procesar. Reformúlala como una pregunta sobre servicios universitarios.",
          code: "security_policy",
          blocked: true,
        },
        { status: 400, headers: { ...rateLimitHeaders(burst), "X-Request-Id": requestId } },
      );
    }

    const message = security.sanitized;
    const locale = body.locale ?? "es";

    const clarification = needsClarification(message);
    if (clarification) {
      return json(
        {
          answer: clarification,
          agent: "campus-orchestrator",
          citations: [],
          needsHuman: false,
          suggestedTicket: null,
          clarification: true,
          requestId,
        },
        { headers: { ...rateLimitHeaders(burst), "X-Request-Id": requestId } },
      );
    }

    try {
      viewer = await getViewer();
    } catch {
      viewer = null;
    }
    const agent = classifyIntent(message);
    const chunks = retrieve(message, {
      topK: 5,
      locale,
      includeDemo: true,
      minConfidence: 0.15,
    });
    const confidence = retrievalConfidence(chunks);
    const score = topScore(chunks);
    const hasEvidence = !shouldAbstain(message, chunks);
    const effectiveChunks = hasEvidence ? chunks : [];

    const citations: Citation[] = effectiveChunks
      .filter((c, i, list) => list.findIndex((x) => x.documentId === c.documentId) === i)
      .map((c, i) => ({
        index: i + 1,
        title: c.title,
        url: c.sourceUrl,
        snippet: c.snippet.slice(0, 320),
        type: c.sourceType,
        organization: c.organization,
        reviewedAt: c.reviewedAt,
      }));

    const prepared: PreparedChat = {
      message,
      locale,
      agent,
      chunks,
      effectiveChunks,
      citations,
      system: buildChatSystemPrompt({ locale, agent }),
      user: buildChatUserPrompt({ message, chunks: effectiveChunks }),
      hasEvidence,
      confidence,
      score,
      requestId,
      startedAt,
      rateHeaders: { ...rateLimitHeaders(burst), "X-Request-Id": requestId },
      conversationId: body.conversationId,
      viewer,
    };

    if (body.stream) return streamChat(prepared);

    let content: string;
    let model = "grounded-extractive-v1";
    let inputTokens = 0;
    let outputTokens = 0;
    let aiGenerated = false;
    let notice: Notice | null = null;

    if (!effectiveChunks.length) {
      const composed = composeGroundedAnswer({
        query: message,
        chunks: [],
        agent,
        locale,
        reason: "no_evidence",
      });
      content = composed.answer;
      model = "grounded-no-evidence";
      notice = { code: "no_evidence", message: composed.notice };
    } else {
      try {
        const result = await callLLM({ system: prepared.system, user: prepared.user });
        content = result.content;
        model = result.model;
        inputTokens = result.inputTokens ?? 0;
        outputTokens = result.outputTokens ?? 0;
        aiGenerated = true;
      } catch (err) {
        const quota = err instanceof LLMQuotaExceededError;
        const composed = composeGroundedAnswer({
          query: message,
          chunks: effectiveChunks,
          agent,
          locale,
          reason: quota ? "quota" : "unavailable",
          quotaResetAt: quota ? err.quota.resetAt : undefined,
        });
        content = composed.answer;
        notice = {
          code: quota ? "llm_quota" : "llm_unavailable",
          message: composed.notice,
          ...(quota ? { quotaResetAt: err.quota.resetAt } : {}),
        };
        console.warn("[chat] LLM no disponible:", err instanceof Error ? err.message.slice(0, 180) : "error");
      }
    }

    const noEvidence = /no (hay|se ha encontrado|tengo) (evidencia|información|fuentes)/i.test(content);
    const needsHuman = !hasEvidence || confidence < 0.34 || score < 1.2 || noEvidence;

    const persisted = await persistExchange({
      conversationId: body.conversationId,
      message,
      content,
      citations,
      agent,
      locale,
    });

    recordChatMetric({ prepared, model, inputTokens, outputTokens, needsHuman, noEvidence });

    return json(
      buildPayload({
        prepared,
        content,
        model,
        aiGenerated,
        notice,
        needsHuman,
        conversationId: persisted.conversationId,
        persisted: persisted.persisted,
        noEvidence,
      }),
      { headers: prepared.rateHeaders },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return json(
        { error: "Consulta inválida: revisa el texto enviado.", code: "validation_error", requestId },
        { status: 400, headers: { "X-Request-Id": requestId } },
      );
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    await reportServerError({
      requestId,
      route: "/api/chat",
      method: req.method,
      message,
      organizationId: viewer?.organizationId ?? null,
      source: "route",
    });
    return json(
      { error: "No se pudo procesar la consulta. Inténtalo de nuevo.", code: "internal_error", requestId },
      { status: 500, headers: { "X-Request-Id": requestId } },
    );
  }
}
