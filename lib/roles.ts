/**
 * Roles de producto y matriz de permisos.
 *
 * Los roles de producto (estudiante, pas, pdi, admin) se mapean a los roles
 * persistidos en `memberships.role`. La migración 0002 amplía el CHECK para
 * aceptar los cuatro valores; hasta aplicarla, `org_admin` ≡ admin,
 * `operator` ≡ pas y `user` ≡ estudiante.
 */

export type AppRole = "estudiante" | "pas" | "pdi" | "admin";

export type Permission =
  | "chat.use"
  | "tickets.create"
  | "tickets.read.own"
  | "tickets.manage"
  | "conversations.read.own"
  | "conversations.read.org"
  | "knowledge.read"
  | "knowledge.manage"
  | "metrics.read"
  | "members.manage"
  | "agents.manage"
  | "audit.read"
  | "integrations.manage"
  | "admin.access";

const PERMISSIONS: Record<AppRole, Permission[]> = {
  estudiante: [
    "chat.use",
    "tickets.create",
    "tickets.read.own",
    "conversations.read.own",
    "knowledge.read",
  ],
  pdi: [
    "chat.use",
    "tickets.create",
    "tickets.read.own",
    "conversations.read.own",
    "knowledge.read",
    "knowledge.manage",
  ],
  pas: [
    "chat.use",
    "tickets.create",
    "tickets.read.own",
    "tickets.manage",
    "conversations.read.own",
    "conversations.read.org",
    "knowledge.read",
    "knowledge.manage",
    "metrics.read",
    "audit.read",
    "admin.access",
  ],
  admin: [
    "chat.use",
    "tickets.create",
    "tickets.read.own",
    "tickets.manage",
    "conversations.read.own",
    "conversations.read.org",
    "knowledge.read",
    "knowledge.manage",
    "metrics.read",
    "members.manage",
    "agents.manage",
    "audit.read",
    "integrations.manage",
    "admin.access",
  ],
};

const DB_ROLE_MAP: Record<string, AppRole> = {
  org_admin: "admin",
  admin: "admin",
  operator: "pas",
  pas: "pas",
  pdi: "pdi",
  user: "estudiante",
  estudiante: "estudiante",
  student: "estudiante",
};

export function normalizeRole(value: string | null | undefined): AppRole {
  if (!value) return "estudiante";
  return DB_ROLE_MAP[value.toLowerCase()] ?? "estudiante";
}

export function toDatabaseRole(role: AppRole): string {
  switch (role) {
    case "admin":
      return "org_admin";
    case "pas":
      return "operator";
    default:
      return role;
  }
}

export function can(role: AppRole, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: AppRole): Permission[] {
  return [...PERMISSIONS[role]];
}

export function roleLabel(role: AppRole, locale: "es" | "gl" | "en" = "es"): string {
  const labels: Record<AppRole, Record<"es" | "gl" | "en", string>> = {
    estudiante: { es: "Estudiante", gl: "Estudante", en: "Student" },
    pas: { es: "PAS", gl: "PAS", en: "Administrative staff" },
    pdi: { es: "PDI", gl: "PDI", en: "Teaching staff" },
    admin: { es: "Administración", gl: "Administración", en: "Administrator" },
  };
  return labels[role][locale];
}

/** Devuelve la ruta inicial permitida para un rol. */
export function landingFor(role: AppRole): string {
  return can(role, "admin.access") ? "/admin" : "/app";
}
