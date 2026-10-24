/**
 * Adaptadores para sistemas UVigo.
 *
 * No hay endpoints públicos documentados de SEDE, Secretaría o Campus Remoto.
 * Este módulo define el contrato y deja la configuración por variables de
 * entorno. Sin `UVIGO_*_BASE_URL` devuelve `configured: false` y no inventa
 * datos: la UI muestra "integración pendiente de convenio".
 */

export type IntegrationName = "sede" | "secretaria" | "campus-remoto";

type IntegrationConfig = {
  name: IntegrationName;
  label: string;
  baseUrl?: string;
  token?: string;
  mode: "rest" | "soap" | "unknown";
};

const CONFIG: Record<IntegrationName, IntegrationConfig> = {
  sede: {
    name: "sede",
    label: "SEDE / Gestión académica",
    baseUrl: process.env.UVIGO_SEDE_BASE_URL,
    token: process.env.UVIGO_SEDE_API_KEY,
    mode: "rest",
  },
  secretaria: {
    name: "secretaria",
    label: "Secretaría virtual",
    baseUrl: process.env.UVIGO_SECRETARIA_BASE_URL,
    token: process.env.UVIGO_SECRETARIA_API_KEY,
    mode: "rest",
  },
  "campus-remoto": {
    name: "campus-remoto",
    label: "Campus Remoto",
    baseUrl: process.env.UVIGO_CAMPUS_REMOTO_BASE_URL,
    token: process.env.UVIGO_CAMPUS_REMOTO_API_KEY,
    mode: "unknown",
  },
};

export class IntegrationNotConfiguredError extends Error {
  constructor(public integration: IntegrationName) {
    super(`La integración ${integration} no está configurada`);
    this.name = "IntegrationNotConfiguredError";
  }
}

export class IntegrationRequestError extends Error {
  constructor(
    public integration: IntegrationName,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "IntegrationRequestError";
  }
}

function configFor(name: IntegrationName): IntegrationConfig & { baseUrl: string } {
  const config = CONFIG[name];
  if (!config.baseUrl) throw new IntegrationNotConfiguredError(name);
  return config as IntegrationConfig & { baseUrl: string };
}

async function request<T>(name: IntegrationName, path: string, init: RequestInit = {}): Promise<T> {
  const config = configFor(name);
  const url = new URL(path, config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new IntegrationRequestError(name, `HTTP ${res.status} en ${name}`, res.status);
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof IntegrationRequestError || error instanceof IntegrationNotConfiguredError) throw error;
    throw new IntegrationRequestError(name, error instanceof Error ? error.message : "Error de red");
  } finally {
    clearTimeout(timeout);
  }
}

export type AcademicCalendarEntry = {
  title: string;
  startsAt?: string;
  endsAt?: string;
  description?: string;
};

export async function getAcademicCalendar(): Promise<AcademicCalendarEntry[]> {
  return request<AcademicCalendarEntry[]>("sede", "api/v1/calendario-academico");
}

export type ProcedureStatus = {
  id: string;
  status: "open" | "in_progress" | "resolved" | "unknown";
  updatedAt?: string;
};

export async function getProcedureStatus(procedureId: string): Promise<ProcedureStatus> {
  return request<ProcedureStatus>("secretaria", `api/v1/expedientes/${encodeURIComponent(procedureId)}`);
}

export type RemoteCourse = {
  id: string;
  name: string;
  url?: string;
};

export async function getRemoteCourses(): Promise<RemoteCourse[]> {
  return request<RemoteCourse[]>("campus-remoto", "api/v1/cursos");
}

export type IntegrationHealth = {
  name: IntegrationName;
  label: string;
  configured: boolean;
  mode: "rest" | "soap" | "unknown";
  host: string | null;
  hasToken: boolean;
};

export function getIntegrationHealth(): IntegrationHealth[] {
  return Object.values(CONFIG).map((config) => ({
    name: config.name,
    label: config.label,
    configured: Boolean(config.baseUrl),
    mode: config.mode,
    host: config.baseUrl ? safeHost(config.baseUrl) : null,
    hasToken: Boolean(config.token),
  }));
}

function safeHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "configuración inválida";
  }
}

export function isIntegrationConfigured(name: IntegrationName) {
  return Boolean(CONFIG[name].baseUrl);
}
