"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, Pause, Play, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SLIDES = [
  {
    src: "/campus/students-campus-vigo.jpg",
    alt: "Estudiantes de la Universidade de Vigo reunidos frente al edificio de gestión del campus de Vigo",
    label: "Campus de Vigo",
    detail: "Estudiantes",
  },
  {
    src: "/campus/class-professor.jpg",
    alt: "Un profesor atiende a un grupo de estudiantes durante una visita a los centros de la UVigo",
    label: "Docencia",
    detail: "Profesorado y alumnado",
  },
  {
    src: "/campus/library-central.jpg",
    alt: "Vista interior de la sala de la Biblioteca Central de la Universidade de Vigo",
    label: "Biblioteca Central",
    detail: "Instalaciones",
  },
  {
    src: "/campus/faculty-building.jpg",
    alt: "Edificio de una facultad de la Universidade de Vigo en un día luminoso",
    label: "Facultades",
    detail: "Campus y servicios",
  },
] as const;

const STATS = [
  { value: "23", label: "fuentes oficiales indexadas" },
  { value: "3", label: "campus conectados" },
  { value: "4", label: "perfiles de acceso" },
  { value: "24/7", label: "orientación disponible" },
];

export function HomeHero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % SLIDES.length);
    }, 6200);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  const goTo = useCallback((index: number) => {
    setActive((index + SLIDES.length) % SLIDES.length);
  }, []);

  const current = SLIDES[active];
  const slideLabel = useMemo(() => `${current.label} · ${current.detail}`, [current]);

  return (
    <section
      className="relative isolate overflow-hidden bg-[#f4faff]"
      aria-roledescription="carrusel"
      aria-label="Imágenes del campus de la Universidade de Vigo"
    >
      <div className="absolute inset-0">
        {SLIDES.map((slide, index) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
              index === active ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={index !== active}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={index === 0}
              sizes="100vw"
              className={`object-cover object-center ${index === active && !reducedMotion ? "hero-kenburns" : ""}`}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f7fbff] via-transparent to-white/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(34,211,238,0.22),transparent_42%),radial-gradient(circle_at_88%_72%,rgba(59,130,246,0.18),transparent_38%)]" />
        <div className="hero-grid absolute inset-0 opacity-[0.35]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-16 md:pt-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pb-28">
        <div>
          <Badge className="mb-5 border-cyan-200/70 bg-white/80 text-primary shadow-sm backdrop-blur">
            <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
            Demo independiente · No oficial
          </Badge>

          <h1 className="max-w-3xl text-4xl font-black leading-[1.03] tracking-tight text-slate-950 md:text-6xl">
            Un campus.
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Un superagente.
            </span>
            <br />
            Todos los servicios.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 md:text-xl">
            Orientación académica con IA para la Universidade de Vigo: matrícula, becas,
            calendarios, movilidad y servicios, con <strong className="text-slate-900">fuentes oficiales citadas</strong> y
            derivación humana cuando hace falta.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button render={<Link href="/app/chat" />} size="lg" className="shadow-lg shadow-primary/20">
              Hablar con el superagente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button render={<Link href="/plataforma" />} variant="outline" size="lg" className="bg-white/80 backdrop-blur">
              Ver la plataforma
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <BookOpenCheck className="h-4 w-4 text-cyan-600" />
              Respuestas con enlaces a uvigo.gal
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Sin inventar plazos ni requisitos
            </span>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Imágenes reales del campus:{" "}
            <a
              href="https://www.uvigo.gal/es/universidad/conocenos"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-cyan-400/70 underline-offset-2 hover:text-primary"
            >
              Universidade de Vigo
            </a>
            . Uso académico con atribución.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-cyan-300/30 via-white/10 to-blue-400/30 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-[0_24px_80px_rgba(15,64,120,0.18)] backdrop-blur-xl">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem]">
              <Image
                key={current.src}
                src={current.src}
                alt={current.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover transition-transform duration-[1200ms] ease-out hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/40 bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Campus real · UVigo
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">{current.detail}</p>
                  <p className="text-lg font-semibold">{current.label}</p>
                </div>
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] backdrop-blur-md" aria-live="polite">
                  {active + 1}/{SLIDES.length}
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {STATS.slice(0, 3).map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white/80 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-xl font-black text-primary">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Elegir imagen del campus">
                {SLIDES.map((slide, index) => (
                  <button
                    key={slide.src}
                    type="button"
                    role="tab"
                    aria-selected={index === active}
                    aria-label={`Ver ${slide.label}`}
                    onClick={() => goTo(index)}
                    className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      index === active ? "w-7 bg-primary" : "w-2 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={paused ? "Reanudar rotación de imágenes" : "Pausar rotación de imágenes"}
              >
                {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                {paused ? "Reanudar" : "Pausar"}
              </button>
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            {slideLabel}
          </p>
        </div>
      </div>

      <div className="relative border-t border-white/70 bg-white/70 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-5 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-primary">{stat.value}</span>
              <span className="text-xs leading-tight text-slate-500">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
