import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit";
import { recordFeedback } from "@/lib/feedback";

const BodySchema = z
  .object({
    requestId: z.string().uuid().optional(),
    messageId: z.string().uuid().optional(),
    conversationId: z.string().uuid().optional(),
    agent: z.string().max(60).optional(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
  })
  .refine((value) => Boolean(value.requestId ?? value.messageId), {
    message: "Falta requestId o messageId",
  });

export async function POST(req: Request) {
  const limit = await checkRateLimitAsync(`feedback:${getClientIdentifier(req)}`, { limit: 20, windowMs: 3_600_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Demasiadas valoraciones" }, { status: 429, headers: rateLimitHeaders(limit) });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Valoración inválida" }, { status: 400 });

  const data = parsed.data;
  const requestId = data.requestId ?? data.messageId!;

  let viewer = null;
  try {
    viewer = await getViewer();
  } catch {
    viewer = null;
  }

  const organizationId = viewer?.organizationId ?? null;
  let tablePersisted = false;

  // La tabla `feedback` exige un message_id real guardado en Supabase. Solo se
  // intenta cuando hay sesión, tenant y el chat se persistió.
  if (data.messageId && organizationId && viewer?.user) {
    try {
      const supabase = await getSupabaseServerClient();
      if (supabase) {
        const { error } = await supabase.from("feedback").insert({
          organization_id: organizationId,
          message_id: data.messageId,
          user_id: viewer.user.id,
          rating: data.rating,
          comment: data.comment ?? null,
        });
        tablePersisted = !error;
      }
    } catch {
      tablePersisted = false;
    }
  }

  // `audit_events` no requiere que exista el mensaje: así el feedback anónimo
  // de la demo también llega al panel y se puede revisar.
  const auditPersisted = await recordFeedback({
    requestId,
    rating: data.rating,
    comment: data.comment,
    agent: data.agent,
    conversationId: data.conversationId,
    organizationId,
    userId: viewer?.user?.id ?? null,
  });

  return NextResponse.json({
    ok: true,
    persisted: tablePersisted || auditPersisted,
    audit: auditPersisted,
    received: { requestId, rating: data.rating },
  });
}
