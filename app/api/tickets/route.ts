import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/roles";
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit";


const BodySchema = z.object({
  summary: z.string().min(5).max(500),
  category: z.string().max(60).optional(),
  conversationId: z.string().uuid().optional(),
});

type DemoTicket = {
  id: string;
  summary: string;
  category: string;
  status: string;
  createdAt: string;
};

const globalStore = globalThis as typeof globalThis & { __vigoDemoTickets?: DemoTicket[] };
const demoTickets = (globalStore.__vigoDemoTickets ??= []);

export async function POST(req: Request) {
  const limit = await checkRateLimitAsync(`tickets:${getClientIdentifier(req)}`, { limit: 5, windowMs: 3_600_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Inténtalo más tarde." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const body = parsed.data;
  const viewer = await getViewer();
  const supabase = await getSupabaseServerClient();

  if (supabase && viewer.user) {
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        organization_id: viewer.organizationId,
        conversation_id: body.conversationId ?? null,
        created_by: viewer.user.id,
        category: body.category || "general",
        summary: body.summary,
        status: "open",
      })
      .select("id, summary, category, status, created_at")
      .single();

    if (!error && data) {
      const admin = getSupabaseAdminClient();
      void admin?.from("audit_events").insert({
        organization_id: viewer.organizationId,
        actor_user_id: viewer.user.id,
        action: "ticket.created",
        target_type: "ticket",
        target_id: data.id,
        metadata: { category: data.category },
      });
      return NextResponse.json({
        id: data.id,
        summary: data.summary,
        category: data.category,
        status: data.status,
        createdAt: data.created_at,
        persisted: true,
      });
    }
    return NextResponse.json({ error: "No se pudo crear la derivación" }, { status: 500 });
  }

  const ticket: DemoTicket = {
    id: crypto.randomUUID(),
    summary: body.summary,
    category: body.category || "general",
    status: "open",
    createdAt: new Date().toISOString(),
  };
  demoTickets.unshift(ticket);
  if (demoTickets.length > 100) demoTickets.length = 100;
  return NextResponse.json({ ...ticket, persisted: false });
}

type TicketRow = {
  id: string;
  summary: string;
  category: string;
  status: string;
  created_at: string;
  created_by?: string | null;
};

function serializeTicket(row: TicketRow | DemoTicket) {
  return {
    id: row.id,
    summary: row.summary,
    category: row.category,
    status: row.status,
    createdAt: "created_at" in row ? row.created_at : row.createdAt,
  };
}

export async function GET() {
  const viewer = await getViewer();
  const canManage = can(viewer.role, "tickets.manage");
  const canReadOwn = can(viewer.role, "tickets.read.own");
  if (!canManage && !canReadOwn) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (viewer.mode === "supabase" && viewer.organizationId) {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ tickets: [], persisted: false });
    }

    let query = admin
      .from("tickets")
      .select("id, summary, category, status, created_at, created_by")
      .eq("organization_id", viewer.organizationId);

    // Sin permiso de gestión, un usuario solo ve sus propias derivaciones.
    if (!canManage) {
      if (!viewer.user) return NextResponse.json({ tickets: [], persisted: true });
      query = query.eq("created_by", viewer.user.id);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[tickets] no se pudieron listar", error.message);
      return NextResponse.json({ error: "No se pudieron cargar las derivaciones." }, { status: 500 });
    }
    return NextResponse.json({
      tickets: ((data ?? []) as TicketRow[]).map(serializeTicket),
      persisted: true,
    });
  }

  if (viewer.mode === "demo") {
    return NextResponse.json({ tickets: demoTickets.map(serializeTicket), persisted: false });
  }

  return NextResponse.json({ tickets: [], persisted: false });
}


