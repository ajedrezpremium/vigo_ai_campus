import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { HomeHero } from "@/components/home-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listCorpusDocuments, getCorpusStats } from "@/lib/retrieval";

const features = [
  {
    icon: MessageSquareText,
    title: "Un único punto de entrada",
    text: "Matrícula, becas, calendarios, movilidad o servicios TIC. El superagente clasifica la consulta y coordina al agente adecuado.",
    accent: "from-blue-500 to-cyan-400",
  },
  {
    icon: BookOpenCheck,
    title: "Respuestas con fuentes",
    text: "Cada respuesta se apoya en documentos oficiales de uvigo.gal o en fuentes demo claramente etiquetadas. Sin citas inventadas.",
    accent: "from-cyan-500 to-emerald-400",
  },
  {
    icon: ShieldCheck,
    title: "Límites explícitos",
    text: "Si no hay evidencia suficiente, lo dice. No inventa plazos, importes ni requisitos, y propone derivación humana.",
    accent: "from-emerald-500 to-lime-400",
  },
  {
    icon: Users,
    title: "Multi-perfil y multi-tenant",
    text: "Estudiante, PAS, PDI y administración. Datos aislados por organización con Supabase Row Level Security.",
    accent: "from-indigo-500 to-blue-400",
  },
];

const agents = [
  {
    icon: GraduationCap,
    name: "Student Agent",
    text: "Grados, matrícula, becas, calendario, movilidad y vida en el campus.",
    color: "text-sky-700 bg-sky-50 border-sky-100",
  },
  {
    icon: FileCheck2,
    name: "Admin Agent",
    text: "Procedimientos, documentación y borradores. Nunca presenta solicitudes oficiales.",
    color: "text-amber-700 bg-amber-50 border-amber-100",
  },
  {
    icon: BookOpenCheck,
    name: "Knowledge Agent",
    text: "Recupera y cita fuentes autorizadas, con fecha de revisión y enlace oficial.",
    color: "text-emerald-700 bg-emerald-50 border-emerald-100",
  },
  {
    icon: Users,
    name: "Support Agent",
    text: "Detecta casos sin evidencia y prepara la derivación al servicio responsable.",
    color: "text-rose-700 bg-rose-50 border-rose-100",
  },
];

export default function Home() {
  const stats = getCorpusStats();
  const officialDocuments = listCorpusDocuments()
    .filter((doc) => doc.status === "official")
    .slice(0, 6);

  return (
    <div className="bg-[#f8fbff]">
      <HomeHero />

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-3 bg-cyan-50 text-cyan-800">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Diseñado para orientar, no para inventar
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            La capa de confianza que faltaba en el campus
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Un asistente que entiende la pregunta, busca en la fuente correcta y te dice
            exactamente de dónde sale cada dato.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="group border-white bg-white/80 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <CardHeader className="pb-3">
                <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} text-white shadow-lg`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base leading-snug">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-slate-600">{feature.text}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-cyan-100/70 bg-gradient-to-br from-white via-cyan-50/60 to-blue-50 py-16 md:py-24">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Así responde</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              De una pregunta a una respuesta verificable
            </h2>
            <p className="mt-4 text-slate-600">
              El agente recupera fragmentos, prioriza fuentes oficiales y redacta una respuesta
              breve con pasos siguientes. Si la confianza es baja, deriva.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {[
                "Cita la URL oficial de cada dato relevante.",
                "Distingue fuentes oficiales de fuentes demo.",
                "Muestra la fecha de captura del documento.",
                "No ejecuta trámites ni modifica expedientes.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
            <Button render={<Link href="/demo" />} className="mt-7" size="lg">
              Probar una consulta real
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-cyan-300/30 to-blue-400/20 blur-2xl" />
            <Card className="relative overflow-hidden border-white/80 bg-white/90 shadow-[0_24px_70px_rgba(15,64,120,0.16)] backdrop-blur">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-500 text-xs font-bold text-white">V</span>
                    <div>
                      <p className="text-sm font-semibold">Superagente</p>
                      <p className="text-[11px] text-emerald-600">● Fuentes oficiales conectadas</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">DEMO</Badge>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    ¿Cómo me matriculo en un grado?
                  </div>
                </div>

                <div className="mt-3 max-w-[92%] rounded-2xl rounded-bl-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">## Resumen</p>
                  <p className="mt-1">
                    La matrícula se realiza por la secretaría virtual. Debes identificarte, elegir
                    estudios y asignaturas, y revisar los plazos del calendario oficial.
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">## Pasos siguientes</p>
                  <ol className="mt-1 list-decimal space-y-1 pl-4 text-[13px]">
                    <li>Consulta la página oficial de matrícula.</li>
                    <li>Confirma el plazo en el calendario 2026/2027.</li>
                    <li>Contacta con la secretaría de tu centro si hay incidencias.</li>
                  </ol>
                </div>

                <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-800">Fuentes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href="https://www.uvigo.gal/es/estudiar/gestiones-estudiantes/matriculate"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[11px] text-cyan-900 hover:border-cyan-400"
                    >
                      Matrícula · uvigo.gal ↗
                    </a>
                    <a
                      href="https://www.uvigo.gal/sites/uvigo.gal/files/docs/universidade/institucional/calendario/Calendario_Academico_UVigo_2026-27.pdf"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[11px] text-cyan-900 hover:border-cyan-400"
                    >
                      Calendario 2026/27 · PDF ↗
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Equipo de agentes</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Especialistas que se coordinan
            </h2>
          </div>
          <Button render={<Link href="/agentes" />} variant="outline">
            Ver arquitectura
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {agents.map((agent) => (
            <div key={agent.name} className={`rounded-2xl border p-5 ${agent.color}`}>
              <agent.icon className="h-6 w-6" />
              <h3 className="mt-3 font-bold">{agent.name}</h3>
              <p className="mt-1 text-sm leading-relaxed opacity-80">{agent.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Base de conocimiento</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                {stats.officialDocuments} fuentes oficiales, recién capturadas
              </h2>
              <p className="mt-3 text-slate-600">
                Corpus versionado y regenerable con <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run ingest:uvigo</code>.
                Incluye páginas HTML y PDFs del calendario académico.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-2xl font-black text-primary">{stats.characters.toLocaleString("es-ES")}</p>
                  <p className="text-xs text-slate-500">caracteres indexados</p>
                </div>
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-2xl font-black text-primary">{stats.pdfDocuments}</p>
                  <p className="text-xs text-slate-500">PDFs oficiales</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {officialDocuments.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {doc.kind === "pdf" ? <FileCheck2 className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                    {doc.kind} · {doc.locale}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-primary">
                    {doc.title}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-500">Capturado: {doc.reviewedAt}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/70 via-white to-blue-100/70" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <Badge className="mb-4 bg-white/80 text-primary">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Transparencia desde el primer clic
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
            Prueba el campus del futuro.
            <br />
            <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">Hoy, en modo demo.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Sin registro para explorar. Con cuenta, historial persistente, derivaciones y panel de métricas.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button render={<Link href="/app/chat" />} size="lg" className="shadow-lg shadow-primary/20">
              Abrir el superagente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button render={<Link href="/login" />} variant="outline" size="lg" className="bg-white/80">
              Crear cuenta
            </Button>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            Proyecto académico independiente. No afiliado ni respaldado por la Universidade de Vigo.
          </p>
        </div>
      </section>
    </div>
  );
}
