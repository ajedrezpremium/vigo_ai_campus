import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { normalizeRole, type AppRole, type Permission, can } from "@/lib/roles";

export type Viewer = {
  mode: "demo" | "supabase";
  user: { id: string; email: string | null } | null;
  role: AppRole;
  membershipRole: string | null;
  organizationId: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
};

const DEMO_VIEWER: Viewer = {
  mode: "demo",
  user: null,
  role: "admin",
  membershipRole: "org_admin",
  organizationId: null,
  organizationName: "Demo VIGO AI CAMPUS",
  organizationSlug: "demo-vigo",
};

export const getViewer = cache(async (): Promise<Viewer> => {
  if (!isSupabaseConfigured()) return DEMO_VIEWER;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ...DEMO_VIEWER, mode: "demo" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      mode: "supabase",
      user: null,
      role: "estudiante",
      membershipRole: null,
      organizationId: null,
      organizationName: null,
      organizationSlug: null,
    };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, organization_id, organizations(name, slug)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const org = Array.isArray(membership?.organizations)
    ? membership?.organizations[0]
    : membership?.organizations;

  return {
    mode: "supabase",
    user: { id: user.id, email: user.email ?? null },
    role: normalizeRole(membership?.role),
    membershipRole: membership?.role ?? null,
    organizationId: membership?.organization_id ?? null,
    organizationName: org?.name ?? null,
    organizationSlug: org?.slug ?? null,
  };
});

export async function viewerCan(permission: Permission): Promise<boolean> {
  const viewer = await getViewer();
  return can(viewer.role, permission);
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requirePermission(permission: Permission): Promise<Viewer> {
  const viewer = await getViewer();
  if (!can(viewer.role, permission)) {
    throw new AuthorizationError("No tienes permisos para esta acción");
  }
  return viewer;
}

/**
 * Crea la organización/membresía inicial de un usuario autenticado.
 * Es idempotente. Si la organización no tiene administradores, el primer
 * usuario pasa a ser admin (bootstrap del TFG).
 */
export async function provisionMembership(userId: string, email: string | null) {
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, reason: "supabase-not-configured" as const };

  const { data: existing } = await admin
    .from("memberships")
    .select("role, organization_id, organizations(name, slug)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: true, role: existing.role, organizationId: existing.organization_id };

  let { data: organization } = await admin
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", "demo-vigo")
    .maybeSingle();

  if (!organization) {
    const { data: anyOrg } = await admin.from("organizations").select("id, name, slug").limit(1).maybeSingle();
    organization = anyOrg;
  }

  if (!organization) {
    const { data: created, error } = await admin
      .from("organizations")
      .insert({ name: "Universidade de Vigo", slug: "uvigo", status: "active", default_locale: "es" })
      .select("id, name, slug")
      .single();
    if (error || !created) return { ok: false, reason: "organization-create-failed" as const };
    organization = created;
  }

  const { count } = await admin
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id)
    .eq("role", "org_admin");

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isBootstrapAdmin = !count || allowlist.includes((email ?? "").toLowerCase());
  const role = isBootstrapAdmin ? "org_admin" : "user";

  const { error: insertError } = await admin.from("memberships").insert({
    organization_id: organization.id,
    user_id: userId,
    role,
  });

  if (insertError && insertError.code !== "23505") {
    return { ok: false, reason: "membership-create-failed" as const };
  }

  return { ok: true, role, organizationId: organization.id, organizationName: organization.name };
}
