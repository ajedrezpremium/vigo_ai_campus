export type AgentSlug =
  | "campus-orchestrator"
  | "student-agent"
  | "admin-agent"
  | "knowledge-agent"
  | "support-agent";

export const AGENTS = [
  {
    slug: "campus-orchestrator",
    name: "Campus Orchestrator",
    description: "Clasifica la consulta, pide aclaraciones y coordina agentes.",
    color: "bg-indigo-600",
  },
  {
    slug: "student-agent",
    name: "Student Agent",
    description: "Titulaciones, matrícula, calendarios, becas y servicios.",
    color: "bg-sky-600",
  },
  {
    slug: "admin-agent",
    name: "Admin Agent",
    description: "Explica procedimientos y prepara borradores sin presentar solicitudes oficiales.",
    color: "bg-amber-600",
  },
  {
    slug: "knowledge-agent",
    name: "Knowledge Agent",
    description: "Recupera información de fuentes autorizadas y devuelve citas.",
    color: "bg-emerald-600",
  },
  {
    slug: "support-agent",
    name: "Support Agent",
    description: "Detecta falta de evidencia, gestiona feedback y prepara derivaciones.",
    color: "bg-rose-600",
  },
] as const;

const STUDENT_KEYWORDS = [
  "matricula",
  "matricular",
  "beca",
  "ayuda",
  "calendario",
  "examen",
  "asignatura",
  "titulacion",
  "grado",
  "movilidad",
  "erasmus",
  "biblioteca",
  "acceso",
];
const ADMIN_KEYWORDS = [
  "tramite",
  "procedimiento",
  "solicitud",
  "incidencia",
  "certificado",
  "secretaria",
  "derivacion",
  "justificante",
];
const SUPPORT_KEYWORDS = [
  "ayuda humana",
  "no resuelve",
  "hablar con",
  "contacto",
  "reclamacion",
];

export function classifyIntent(query: string): AgentSlug {
  const q = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (SUPPORT_KEYWORDS.some((k) => q.includes(k))) return "support-agent";
  const studentScore = STUDENT_KEYWORDS.filter((k) => q.includes(k)).length;
  const adminScore = ADMIN_KEYWORDS.filter((k) => q.includes(k)).length;
  if (adminScore > studentScore && adminScore > 0) return "admin-agent";
  if (studentScore > 0) return "student-agent";
  return "knowledge-agent";
}

export function agentInstructions(slug: AgentSlug): string {
  switch (slug) {
    case "student-agent":
      return "Actúas como Student Agent. Orienta sobre titulaciones, matrícula, calendarios, becas, movilidad y servicios. No inventes fechas ni requisitos. Usa solo las fuentes recuperadas. Si falta evidencia, dilo y deriva.";
    case "admin-agent":
      return "Actúas como Admin Agent. Explica procedimientos y prepara borradores. No presentes solicitudes oficiales ni modifiques expedientes. Deriva cuando corresponda.";
    case "knowledge-agent":
      return "Actúas como Knowledge Agent. Recupera y cita fuentes autorizadas. Devuelve referencias verificables. Indica incertidumbre si no hay evidencia.";
    case "support-agent":
      return "Actúas como Support Agent. Detecta falta de evidencia, gestiona feedback y prepara derivaciones al servicio adecuado.";
    default:
      return "Actúas como Campus Orchestrator. Clasifica, pide aclaraciones si es necesario y coordina.";
  }
}

export function needsClarification(query: string): string | null {
  const q = query.trim();
  if (q.length < 6) return "¿Puedes concretar un poco más tu consulta?";
  if (q.split(/\s+/).length < 2) return "¿Sobre qué servicio o trámite necesitas información?";
  return null;
}
