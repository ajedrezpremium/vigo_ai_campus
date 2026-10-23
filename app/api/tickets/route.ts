import { NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  summary: z.string().min(1).max(500),
  category: z.string().max(60).optional(),
  conversationId: z.string().optional(),
});

const tickets: { id: string; summary: string; category: string; status: string; createdAt: string }[] = [];

export async function POST(req: Request) {
  const body = BodySchema.parse(await req.json());
  const ticket = {
    id: crypto.randomUUID(),
    summary: body.summary,
    category: body.category || "general",
    status: "open",
    createdAt: new Date().toISOString(),
  };
  tickets.push(ticket);
  return NextResponse.json(ticket);
}

export async function GET() {
  return NextResponse.json(tickets);
}
