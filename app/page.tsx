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
import { getLocale } from "@/lib/i18n/server";
import { messages } from "@/lib/i18n/messages";

const FEATURE_ICONS = [MessageSquareText, BookOpenCheck, ShieldCheck, Users];
const FEATURE_ACCENTS = [
  "from-blue-500 to-cyan-400",
  "from-cyan-500 to-emerald-400",
  "from-emerald-500 to-lime-400",
  "from-indigo-500 to-blue-400",
];

const AGENT_ICONS = [GraduationCap, FileCheck2, BookOpenCheck, Users];
const AGENT_STYLES = [
  "text-sky-700 bg-sky-50 border-sky-100",
  "text-amber-700 bg-amber-50 border-amber-100",
  "text-emerald-700 bg-emerald-50 border-emerald-100",
  "text-rose-700 bg-rose-50 border-rose-100",
];
const AGENT_NAMES = ["Student Agent", "Admin Agent", "Knowledge Agent", "Support Agent"];

function numberLocale(locale: "es" | "gl" | "en") {
  return locale === "en" ? "en-GB" : locale === "gl" ? "gl-ES" : "es-ES";
}

export default async function Home() {
  const locale = await getLocale();
  const home = messages[locale].home;
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
            {home.badge}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            {home.title}
          </h2>
          <p className="mt-3 text-lg text-slate-600">{home.intro}</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {home.features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index];
            return (
              <Card key={feature.title} className="group border-white bg-white/80 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <CardHeader className="pb-3">
                  <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${FEATURE_ACCENTS[index]} text-white shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base leading-snug">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-slate-600">{feature.text}</CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-cyan-100/70 bg-gradient-to-br from-white via-cyan-50/60 to-blue-50 py-16 md:py-24">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">{home.howEyebrow}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              {home.howTitle}
            </h2>
            <p className="mt-4 text-slate-600">{home.howIntro}</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {home.howPoints.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
            <Button render={<Link href="/demo" />} className="mt-7" size="lg">
              {home.howCta}
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
                      <p className="text-sm font-semibold">{home.cardAgent}</p>
                      <p className="text-[11px] text-emerald-600">● {home.cardConnected}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">DEMO</Badge>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {home.cardQuestion}
                  </div>
                </div>

                <div className="mt-3 max-w-[92%] rounded-2xl rounded-bl-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{home.cardSummary}</p>
                  <p className="mt-1">{home.cardSummaryText}</p>
                  <p className="mt-2 font-semibold text-slate-900">{home.cardSteps}</p>
                  <ol className="mt-1 list-decimal space-y-1 pl-4 text-[13px]">
                    <li>{home.cardStep1}</li>
                    <li>{home.cardStep2}</li>
                    <li>{home.cardStep3}</li>
                  </ol>
                </div>

                <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-800">{home.cardSources}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href="https://www.uvigo.gal/es/estudiar/gestiones-estudiantes/matriculate"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[11px] text-cyan-900 hover:border-cyan-400"
                    >
                      {home.cardSource1} ↗
                    </a>
                    <a
                      href="https://www.uvigo.gal/sites/uvigo.gal/files/docs/universidade/institucional/calendario/Calendario_Academico_UVigo_2026-27.pdf"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[11px] text-cyan-900 hover:border-cyan-400"
                    >
                      {home.cardSource2} ↗
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">{home.agentsEyebrow}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              {home.agentsTitle}
            </h2>
          </div>
          <Button render={<Link href="/agentes" />} variant="outline">
            {home.agentsCta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {AGENT_NAMES.map((name, index) => {
            const Icon = AGENT_ICONS[index];
            return (
              <div key={name} className={`rounded-2xl border p-5 ${AGENT_STYLES[index]}`}>
                <Icon className="h-6 w-6" />
                <h3 className="mt-3 font-bold">{name}</h3>
                <p className="mt-1 text-sm leading-relaxed">{home.agentDescriptions[index]}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">{home.corpusEyebrow}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                {home.corpusTitle.replace("{count}", String(stats.officialDocuments))}
              </h2>
              <p className="mt-3 text-slate-600">
                {home.corpusIntro}{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run ingest:uvigo</code>.{" "}
                {home.corpusIntro2}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-2xl font-black text-primary">{stats.characters.toLocaleString(numberLocale(locale))}</p>
                  <p className="text-xs text-slate-500">{home.corpusCharacters}</p>
                </div>
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-2xl font-black text-primary">{stats.pdfDocuments}</p>
                  <p className="text-xs text-slate-500">{home.corpusPdfs}</p>
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
                  <p className="mt-2 text-[11px] text-slate-500">
                    {home.captured} {doc.reviewedAt}
                  </p>
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
            {home.finalBadge}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
            {home.finalTitle1}
            <br />
            <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">{home.finalTitle2}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{home.finalIntro}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button render={<Link href="/app/chat" />} size="lg" className="shadow-lg shadow-primary/20">
              {home.finalCta1}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button render={<Link href="/login" />} variant="outline" size="lg" className="bg-white/80">
              {home.finalCta2}
            </Button>
          </div>
          <p className="mt-6 text-xs text-slate-500">{home.finalNote}</p>
        </div>
      </section>
    </div>
  );
}
