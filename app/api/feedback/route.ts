import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit";


const BodySchema = z.object({
  messageId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const limit = checkRateLimit(`feedback:${getClientIdentifier(req)}`, { limit: 20, windowMs: 3_600_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Demasiadas valoraciones" }, { status: 429, headers: rateLimitHeaders(limit) });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Valoración inválida" }, { status: 400 });

  const viewer = await getViewer();
  const supabase = await getSupabaseServerClient();
  let persisted = false;

  if (supabase && viewer.user && viewer.organizationId && parsed.data.messageId) {
    const { error } = await supabase.from("feedback").insert({
      organization_id: viewer.organizationId,
      message_id: parsed.data.messageId,
      user_id: viewer.user.id,
      rating: parsed.data.rating ?? null,
      comment: parsed.data.comment ?? null,
    });
    persisted = !error;
  }

  return NextResponse.json({ ok: true, persisted, received: parsed.data });
}


