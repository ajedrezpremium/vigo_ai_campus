import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyIntent, needsClarification, agentInstructions } from "@/lib/agents";
import { retrieve, topScore } from "@/lib/retrieval";
import { callLLM } from "@/lib/llm";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  locale: z.string().optional(),
  conversationId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    const clarification = needsClarification(body.message);
    if (clarification) {
      return NextResponse.json({
        answer: clarification,
        agent: "campus-orchestrator",
        citations: [],
        needsHuman: false,
        suggestedTicket: null,
        clarification: true,
      });
    }

    const agent = classifyIntent(body.message);
    const chunks = retrieve(body.message, 4);
    const score = topScore(chunks);

    const context = chunks
      .map(
        (c, i) =>
          `[Fuente ${i + 1}] ${c.title}\nURL: ${c.sourceUrl}\nContenido: ${c.snippet}`,
      )
      .join("\n\n");

    const citations = chunks.map((c) => ({
      title: c.title,
      url: c.sourceUrl,
      snippet: c.snippet,
    }));

    const system = [
      "Eres VIGO AI CAMPUS, un superagente de demostración para servicios universitarios.",
      "Esta es una demo independiente y no oficial; las fuentes son ficticias y están etiquetadas.",
      "Responde siempre en español claro y profesional.",
      "No inventes fechas límite, requisitos, plazos ni enlaces. Si no hay evidencia suficiente, dilo explícitamente.",
      "No presentes solicitudes oficiales ni modifiques expedientes.",
      "Usa solo el contexto proporcionado. Si el contexto no cubre la pregunta, indica incertidumbre y sugiere derivación.",
      "Formato de respuesta: '## Resumen' (2-4 frases), '## Pasos siguientes' (lista), '## Limitaciones' (si aplica). Máximo 220 palabras.",
      agentInstructions(agent),
    ].join("\n");

    const user = `Consulta del estudiante: ${body.message}\n\nContexto recuperado:\n${context || "Sin fuentes relevantes."}`;

    let content: string;
    let model = "demo-fallback";
    try {
      const result = await callLLM({ system, user });
      content = result.content;
      model = result.model;
    } catch (err) {
      const reason = err instanceof Error ? err.message : "error desconocido";
      const summary = chunks.length
        ? chunks.map((c) => c.snippet).join(" ")
        : "No se han encontrado fuentes relevantes en la demo.";
      content = [
        "## Resumen",
        "Modo demo sin modelo IA: se muestran las fuentes recuperadas para tu consulta.",
        summary,
        "## Pasos siguientes",
        "- Revisa las fuentes citadas más abajo.",
        "- Si necesitas una respuesta personalizada, solicita derivación a un servicio.",
        "## Limitaciones",
        "Respuesta generada sin modelo IA a partir de fragmentos recuperados.",
        `Motivo técnico (sin secretos): ${reason.slice(0, 120)}.`,
      ].join("\\n");
    }

    const needsHuman =
      score < 4 || /no (puedo|tengo evidencia|hay información)/i.test(content);

    let conversationId = body.conversationId;
    try {
      const supabase = await getSupabaseServerClient();
      if (supabase) {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (user) {
          const { data: membership } = await supabase
            .from("memberships")
            .select("organization_id")
            .eq("user_id", user.id)
            .limit(1)
            .single();
          const orgId = membership?.organization_id;
          if (orgId) {
            if (!conversationId) conversationId = crypto.randomUUID();
            await supabase.from("conversations").upsert({
              id: conversationId,
              organization_id: orgId,
              user_id: user.id,
              title: body.message.slice(0, 48),
              locale: body.locale || "es",
              mode: "authenticated",
            });
            await supabase.from("messages").insert([
              {
                organization_id: orgId,
                conversation_id: conversationId,
                role: "user",
                content: body.message,
                agent_slug: null,
              },
              {
                organization_id: orgId,
                conversation_id: conversationId,
                role: "assistant",
                content,
                citations,
                agent_slug: agent,
              },
            ]);
          }
        }
      }
    } catch {
      // persistence is best-effort in demo
    }

    return NextResponse.json({
      answer: content,
      agent,
      model,
      citations,
      needsHuman,
      conversationId,
      suggestedTicket: needsHuman
        ? {
            category: agent === "admin-agent" ? "tramite" : "informacion",
            summary: body.message.slice(0, 180),
          }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
