/**
 * Reglas puras de tenant y rol, sin dependencias de Next.js.
 * Se mantienen aquí para poder probarlas de forma aislada.
 */

export type DemoRole = "admin" | "estudiante";

/**
 * En modo demo el visitante es estudiante salvo que se habilite
 * explícitamente `DEMO_ADMIN=true`.
 */
export function demoRole(isAdminFlagEnabled: boolean): DemoRole {
  return isAdminFlagEnabled ? "admin" : "estudiante";
}

/**
 * Decide el rol de una membresía nueva:
 * - Solo los emails de `ADMIN_EMAILS` son administradores en producción.
 * - El bootstrap automático del primer usuario queda limitado a desarrollo
 *   y a una instalación sin allowlist ni administradores.
 */
export function resolveProvisionRole(input: {
  email: string | null;
  adminEmails: string[];
  adminCount: number;
  isProduction: boolean;
}): "org_admin" | "user" {
  const email = (input.email ?? "").toLowerCase();
  if (input.adminEmails.includes(email)) return "org_admin";
  if (!input.isProduction && input.adminCount === 0 && input.adminEmails.length === 0) {
    return "org_admin";
  }
  return "user";
}
