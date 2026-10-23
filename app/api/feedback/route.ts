import { NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  messageId: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const body = BodySchema.parse(await req.json());
  return NextResponse.json({ ok: true, received: body });
}
