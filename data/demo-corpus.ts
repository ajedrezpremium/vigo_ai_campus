export type DemoDocument = {
  id: string;
  title: string;
  sourceUrl: string;
  locale: "es" | "gl" | "en";
  organization: string;
  reviewedAt: string;
  status: "demo" | "approved";
  content: string;
};

export const DEMO_ORGANIZATION = "Universidade de Vigo (demo no oficial)";

export const DEMO_DOCUMENTS: DemoDocument[] = [
  // --- originales ---
  {
    id: "doc-matricula-2026",
    title: "Matrícula de grado: guía ficticia de demostración",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/matricula-grado",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia y se usa únicamente para la demo. La matrícula de grado suele requerir identificación, pago de tasas y selección de asignaturas. Los plazos exactos dependen del calendario académico oficial y deben confirmarse en la fuente institucional. Si una asignatura está completa, puede existir lista de espera o solicitud de cambio dentro del periodo establecido. Para incidencias de matrícula, contacta con la secretaría de tu centro. La plataforma no presenta solicitudes oficiales ni modifica expedientes.",
  },
  {
    id: "doc-becas",
    title: "Becas y ayudas: información general ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/becas-ayudas",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. Las becas pueden incluir ayudas al estudio, movilidad, colaboración o necesidades específicas. Normalmente se requiere cumplir requisitos académicos y económicos, presentar documentación y respetar el plazo de convocatoria. La plataforma puede orientar sobre dónde buscar la convocatoria y qué documentos suelen pedirse, pero no garantiza concesión ni sustituye a la administración. Para casos particulares, deriva a la unidad de becas.",
  },
  {
    id: "doc-calendario",
    title: "Calendario académico: referencia ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/calendario-academico",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. Un calendario académico incluye inicio y fin de clases, exámenes, periodos de matrícula, vacaciones y plazos administrativos. Las fechas oficiales cambian cada curso y deben consultarse en la fuente vigente. La plataforma no inventa fechas límite; si no hay fecha confirmada, indica incertidumbre y recomienda verificar.",
  },
  {
    id: "doc-movilidad",
    title: "Movilidad internacional: guía ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/movilidad-internacional",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. Los programas de movilidad permiten estudiar en otra universidad durante un periodo. Suelen requerir nivel de idioma, expediente académico, plazas disponibles y aceptación de la institución de destino. La plataforma puede explicar el proceso general y preparar un borrador de consulta, pero la decisión y la gestión corresponden al servicio de internacionalización.",
  },
  {
    id: "doc-biblioteca",
    title: "Biblioteca y recursos digitales: guía ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/biblioteca-recursos",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. La biblioteca ofrece préstamo, salas de estudio, bases de datos y formación en información. El acceso remoto suele requerir credenciales institucionales. Para problemas de acceso, la plataforma deriva al servicio de biblioteca o a soporte informático.",
  },
  {
    id: "doc-incidencias",
    title: "Incidencias y derivación: procedimiento ficticio",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/incidencias-derivacion",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. Cuando el agente no puede resolver una consulta con fuentes autorizadas, debe indicarlo, explicar la limitación y ofrecer crear una derivación al servicio adecuado. La derivación incluye un resumen, categoría y contacto sugerido. No se realizan cambios en expedientes ni se presentan solicitudes oficiales de forma automática.",
  },
  {
    id: "doc-accesibilidad",
    title: "Accesibilidad y soporte: guía ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/accesibilidad-soporte",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. El soporte de accesibilidad puede incluir adaptaciones de exámenes, materiales accesibles y orientación. Las solicitudes formales requieren documentación y valoración por los servicios competentes. La plataforma puede informar del proceso general y derivar el caso.",
  },
  {
    id: "doc-privacidad",
    title: "Privacidad y datos: nota ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/privacidad-datos",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. La plataforma minimiza los datos personales enviados al proveedor de IA y no debe incluir secretos en el cliente. Las conversaciones de demo se almacenan localmente en el navegador salvo que exista un backend configurado. Para producción se requiere revisión legal, RGPD y políticas de retención.",
  },
  // --- historia y funciones pro ---
  {
    id: "doc-historia-uvigo",
    title: "Historia de la Universidade de Vigo: referencia ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/historia-uvigo",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. La Universidade de Vigo se crea en 1990 a partir de la segregación de la Universidade de Santiago de Compostela. Cuenta con tres campus: Vigo, Ourense y Pontevedra. Su lema y valores incluyen compromiso con la calidad, la internacionalización y la transferencia de conocimiento. La institución impulsa investigación, innovación y formación permanente. El agente puede usar esta información para contextualizar respuestas, pero debe indicar que es demo y no sustituye fuentes oficiales.",
  },
  {
    id: "doc-admision",
    title: "Admisión y acceso: guía ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/admision-acceso",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. El acceso a grado puede realizarse por PAU, ciclos formativos, titulados, mayores de 25/40/45 años o vías específicas. Cada vía tiene requisitos y plazos. La plataforma orienta sobre dónde consultar la convocatoria oficial y qué documentación suele requerirse, pero no valida expedientes ni garantiza admisión.",
  },
  {
    id: "doc-empleabilidad",
    title: "Empleabilidad y prácticas: guía ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/empleabilidad-practicas",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. Las prácticas académicas externas requieren convenio, seguro y seguimiento. La empleabilidad incluye ferias de empleo, emprendimiento y orientación. La plataforma puede explicar el proceso general y derivar a la unidad de empleabilidad para casos específicos.",
  },
  {
    id: "doc-investigacion",
    title: "Investigación y transferencia: guía ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/investigacion-transferencia",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. La investigación incluye grupos, proyectos competitivos, tesis y transferencia al tejido empresarial. La plataforma puede orientar sobre dónde buscar convocatorias y contactar con la oficina de transferencia, pero no gestiona proyectos ni firma contratos.",
  },
  {
    id: "doc-campus-servicios",
    title: "Servicios del campus: guía ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/servicios-campus",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. Los servicios del campus incluyen comedor, residencias, transporte, deporte, biblioteca y salud. La plataforma puede informar de horarios generales y derivar al servicio correspondiente para reservas o incidencias.",
  },
  {
    id: "doc-tramites",
    title: "Trámites administrativos: guía ficticia",
    sourceUrl: "https://demo.vigo-ai-campus.local/fuentes/tramites-administrativos",
    locale: "es",
    organization: DEMO_ORGANIZATION,
    reviewedAt: "2026-09-01",
    status: "demo",
    content:
      "Esta fuente es ficticia. Los trámites incluyen certificados, secretaría, convocatorias y gestión económica. La plataforma explica el proceso general y prepara borradores, pero no presenta solicitudes oficiales ni accede a sistemas privados.",
  },
];
