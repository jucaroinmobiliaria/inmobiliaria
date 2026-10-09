"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { HERO_IMAGES } from "@/lib/images";
import type { HomeData, SuggestItem } from "@/lib/types";
import { sizedUrl } from "@/components/ui/photo";
import { ArrowRight, MapPin } from "@/components/ui/icon";
import { popularQuickLinks } from "@/components/search/query";
import { HeroSearch } from "./hero-search";
import { CountUp } from "./count-up";
import { HeroScene } from "./hero-scene";

const SLIDE_MS = 6500;
const WORDS = ["Encuentra", "el", "lugar", "donde", "comienza", "tu", "próxima", "historia."];
const EASE = [0.16, 1, 0.3, 1] as const;

type Props = {
  totals: HomeData["totals"] | null;
  types: { slug: string; name: string; pluralName: string }[];
  popular: SuggestItem[];
};

export function Hero({ totals, types, popular }: Props) {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const n = HERO_IMAGES.length;

  useEffect(() => {
    const on = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => go((i + 1) % n), SLIDE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, paused, n]);

  function go(next: number) {
    setPrev(i);
    setI(next);
  }

  return (
    <section aria-label="Buscador de inmuebles" className="relative">
      <div className="relative isolate flex min-h-[600px] flex-col justify-end sm:min-h-[max(720px,calc(100dvh-56px))] overflow-hidden bg-brand-900 pb-[calc(var(--ov)+36px)] pt-36 [--ov:250px] sm:[--ov:230px] lg:[--ov:96px]">
        {/* Fotografías a sangre con fundido y Ken Burns */}
        <div className="absolute inset-0 -z-10" aria-hidden>
          {HERO_IMAGES.map((im, k) => (
            <div key={im.src} className={cn("absolute inset-0 transition-opacity duration-[1600ms] ease-in-out", k === i ? "opacity-100" : "opacity-0")}>
              <div className={cn("h-full w-full", (k === i || k === prev) && "animate-kenburns")} style={{ animationPlayState: paused ? "paused" : "running" }}>
                <HeroPhoto src={im.src} alt={k === i ? im.alt : ""} seed={k} priority={k === 0} />
              </div>
            </div>
          ))}
        </div>
        <div className="scrim-hero absolute inset-0 -z-10" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-900/55 via-brand-900/15 to-transparent" aria-hidden />

        <div className="container-x">
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium text-white backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sun" />Cada aviso lo aprueba un administrador
          </motion.p>
          <h1 className="display-xl max-w-[15ch] text-white [text-shadow:0_2px_30px_rgb(0_0_0/0.25)] sm:max-w-4xl lg:max-w-[17ch]">
            {WORDS.map((w, k) => (
              <span key={k}>
                <span className="inline-block overflow-hidden pb-[0.14em] align-bottom -mb-[0.14em]">
                  <motion.span className={cn("inline-block", w === "historia." && "italic text-sun")} initial={{ y: "115%", rotate: 3 }} animate={{ y: 0, rotate: 0 }}
                    transition={{ delay: 0.2 + k * 0.075, duration: 1, ease: EASE }}>{w}</motion.span>
                </span>{" "}
              </span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.9, ease: EASE }}
            className="mt-6 hidden max-w-xl text-lg leading-relaxed text-white/90 sm:block sm:text-xl">
            Casas, apartamentos y fincas con fotos reales, mapa y contacto directo. Sin vueltas.
          </motion.p>
        </div>

        {/* Pie de foto + progreso */}
        <div className="container-x pointer-events-none absolute inset-x-0 bottom-[calc(var(--ov)+30px)] hidden items-center justify-end gap-5 lg:flex">
          <AnimatePresence mode="wait">
            <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]"><MapPin className="h-4 w-4" />{HERO_IMAGES[i]!.place}</motion.p>
          </AnimatePresence>
          <div className="pointer-events-auto flex items-center gap-2" role="group" aria-label="Fotografías de portada">
            {HERO_IMAGES.map((im, k) => (
              <button key={im.src} type="button" onClick={() => go(k)} aria-label={`Ver foto ${k + 1}: ${im.place}`} aria-current={k === i}
                className="relative h-1.5 w-9 overflow-hidden rounded-full bg-white/35 outline-offset-4">
                {k === i && <motion.span key={`${i}-${paused}`} className="absolute inset-0 origin-left rounded-full bg-white" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: SLIDE_MS / 1000, ease: "linear" }} />}
                {k < i && <span className="absolute inset-0 rounded-full bg-white/80" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tarjeta de búsqueda flotante */}
      <div className="container-x relative z-20 -mt-[var(--ov)] [--ov:250px] sm:[--ov:230px] lg:[--ov:96px]">
        <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 1, ease: EASE }}>
          <HeroSearch types={types} popular={popular} />
        </motion.div>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Búsquedas populares" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
            <span className="hidden shrink-0 items-center pr-1 text-sm font-medium text-ink-3 lg:inline-flex">Populares:</span>
            {popularQuickLinks.slice(0, 4).map((c) => (
              <Link key={c.href} href={c.href} className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[var(--shadow-card)]">
                {c.label}<ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </Link>
            ))}
          </nav>
          {totals && (
            <dl className="flex shrink-0 items-center gap-7 text-ink" aria-label="Cifras de Jucaro">
              <Stat value={totals.published} label="inmuebles" />
              <Stat value={totals.cities} label="ciudades" />
              <Stat value={totals.advertisers} label="anunciantes" className="hidden sm:block" />
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label, className }: { value: number; label: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="sr-only">{label}</dt>
      <dd className="flex items-baseline gap-2"><CountUp value={value} className="font-display text-[2rem] leading-none tabular" /><span className="text-sm text-ink-3">{label}</span></dd>
    </div>
  );
}

/** Foto a sangre: debajo siempre hay una escena ilustrada (carga y respaldo), la foto aparece con fundido al cargar. */
function HeroPhoto({ src, alt, seed, priority }: { src: string; alt: string; seed: number; priority?: boolean }) {
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el?.complete) setState(el.naturalWidth > 0 ? "ok" : "fail");
  }, []);
  const widths = [800, 1280, 1800, 2400];
  return (
    <div className="relative h-full w-full overflow-hidden">
      <HeroScene seed={seed} />
      {state !== "fail" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={ref} src={sizedUrl(src, 1800)} srcSet={widths.map((w) => `${sizedUrl(src, w)} ${w}w`).join(", ")} sizes="100vw" alt={alt}
          loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" onLoad={() => setState("ok")} onError={() => setState("fail")}
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-1000", state === "ok" ? "opacity-100" : "opacity-0")} />
      )}
    </div>
  );
}
