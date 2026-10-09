import type { Metadata } from "next";
import Link from "next/link";
import { apiServer, requireUser } from "@/lib/server";
import type { MyPublicationRow } from "@/lib/types";
import { HERO_IMAGES } from "@/lib/images";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { StartPublishing } from "@/components/wizard/start-publishing";
import { DraftList } from "@/components/wizard/draft-list";
import { BLOCKS, STEPS, stepsOfBlock } from "@/components/wizard/steps";
import { ArrowRight, Camera, Check, Clock, Handshake, Lock, MapPin, Ruler, ShieldCheck, Tag, Users, type LucideIcon } from "@/components/uploader/icons";

export const metadata: Metadata = {
  title: "Publica tu inmueble",
  description: "Publica tu casa, apartamento, lote o local en Jucaro. Un administrador revisa el aviso antes de que salga al público.",
  robots: { index: false, follow: false },
};

async function loadDrafts(): Promise<MyPublicationRow[]> {
  try {
    const rows = await apiServer<MyPublicationRow[]>("/me/publications", { auth: true, query: { status: "DRAFT" } });
    return Array.isArray(rows) ? [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : [];
  } catch {
    return []; // la portada sigue sirviendo aunque no podamos leer los borradores
  }
}

const MAX_DRAFTS = 6;

const BENEFITS = [
  { icon: Camera, title: "Fotos que enamoran", text: "Súbelas desde el celular o el computador, ordénalas arrastrando y elige la portada. Nosotros las optimizamos por ti." },
  { icon: Users, title: "Llegas a quien lo busca", text: "Tu aviso aparece en la búsqueda y en el mapa. Recibes mensajes y solicitudes de visita en tu panel." },
  { icon: Lock, title: "Tú decides qué mostrar", text: "Oculta la dirección exacta y mostraremos solo una zona aproximada. Edita, pausa o cierra cuando quieras." },
];

const NEEDS = [
  { icon: Camera, title: "5 fotos o más", text: "Mínimo 3, pero con 8 o más tu aviso se ve completo. Luz natural y el celular en horizontal funcionan muy bien." },
  { icon: Tag, title: "El precio", text: "El valor de venta o el canon mensual. Te mostramos cómo se ve frente a avisos parecidos." },
  { icon: MapPin, title: "La ubicación", text: "Ciudad, barrio y un punto en el mapa. Puedes ocultar la dirección exacta." },
  { icon: Ruler, title: "Datos básicos", text: "Área, habitaciones, baños y lo que hace especial a tu inmueble." },
];

const BLOCK_ICON: LucideIcon[] = [Handshake, MapPin, Ruler, Camera, Tag, Check];

export default async function PublicarPage() {
  const user = await requireUser("/publicar");
  const drafts = await loadDrafts();
  const first = user.name.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="bg-white pt-[68px]">
      {/* ------------------------------ Portada ------------------------------ */}
      <section className="container-x grid items-center gap-10 pb-14 pt-8 md:pt-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:gap-14 lg:pb-20 lg:pt-14">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2"><span className="h-px w-8 bg-brand-600" aria-hidden />Hola, {first}</p>
          <h1 className="display-lg mt-4 text-balance">
            Publica tu inmueble.<br />
            <span className="text-brand-600">Llega a quienes lo buscan.</span>
          </h1>
          <p className="mt-5 max-w-[34rem] text-[1.075rem] leading-relaxed text-ink-2">
            Te guiamos paso a paso, desde las fotos hasta el precio. Tu avance se guarda solo, así que puedes parar y seguir cuando quieras.
          </p>

          <StartPublishing className="mt-8 max-w-[34rem]" />

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-[14px] text-ink-2">
            <li className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-brand-600" /> Unos 8 minutos</li>
            <li className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-brand-600" strokeWidth={3} /> Se guarda automáticamente</li>
            <li className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-600" /> Revisamos tu aviso en menos de 24 horas</li>
          </ul>
          {drafts.length > 0 && (
            <a href="#borradores" className="mt-6 inline-flex items-center gap-2 rounded-full bg-sun-soft px-4 py-2 text-[14px] font-semibold text-sun-ink transition hover:brightness-95">
              Tienes {drafts.length} {drafts.length === 1 ? "borrador sin terminar" : "borradores sin terminar"} <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>

        <HeroCollage />
      </section>

      {/* ----------------------------- Borradores ---------------------------- */}
      {drafts.length > 0 && (
        <section id="borradores" className="scroll-mt-24 border-t border-line bg-surface/60 py-14">
          <div className="container-x">
            <Reveal>
              <h2 className="display-md">Continúa donde lo dejaste</h2>
              <p className="mt-2 text-ink-2">Tus borradores se guardan automáticamente. Abre uno y sigue en el paso que te faltó.</p>
            </Reveal>
            <div className="mt-8"><DraftList rows={drafts.slice(0, MAX_DRAFTS)} /></div>
            {drafts.length > MAX_DRAFTS && (
              <p className="mt-6 text-[14.5px] text-ink-2">Mostramos los {MAX_DRAFTS} más recientes. <Link href="/panel/publicaciones" className="font-semibold text-brand-700 underline underline-offset-4">Ver todos en mi panel</Link>.</p>
            )}
          </div>
        </section>
      )}

      {/* ----------------------------- Beneficios ---------------------------- */}
      <section className="container-x py-16 lg:py-24">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Por qué en Jucaro</p>
          <h2 className="display-md mt-3">Una publicación pensada para que se vea tan bien como tu inmueble.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 0.08}>
              <div className="h-full rounded-[28px] border border-line bg-white p-7 transition-shadow duration-500 hover:shadow-[var(--shadow-lift)]">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><b.icon className="h-[26px] w-[26px]" strokeWidth={1.75} /></span>
                <h3 className="font-display mt-6 text-[1.85rem] leading-tight">{b.title}</h3>
                <p className="mt-2.5 leading-relaxed text-ink-2">{b.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* --------------------------- Lo que necesitas ------------------------ */}
      <section className="bg-surface/60 py-16 lg:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <Reveal>
            <p className="eyebrow">Antes de empezar</p>
            <h2 className="display-md mt-3">Ten esto a la mano y terminas en unos 8 minutos.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-2">
              No tiene que ser perfecto: puedes dejarlo como borrador y volver luego. Las fotos son lo que más pesa, así que empieza por ellas si ya las tienes.
            </p>
            <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-[var(--shadow-card)]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-sun-soft text-sun-ink"><Clock className="h-5 w-5" /></span>
              <span className="text-[15px]"><b className="font-semibold">~8 minutos</b> <span className="text-ink-2">con las fotos listas</span></span>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {NEEDS.map((n, i) => (
              <Reveal key={n.title} delay={i * 0.06}>
                <div className="h-full rounded-[24px] border border-line bg-white p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-600"><n.icon className="h-[22px] w-[22px]" strokeWidth={1.75} /></span>
                  <h3 className="mt-4 text-[17px] font-semibold">{n.title}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{n.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- Los 10 pasos --------------------------- */}
      <section className="container-x py-16 lg:py-24">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">El camino</p>
          <h2 className="display-md mt-3">{STEPS.length} pasos cortos, en {BLOCKS.length} bloques.</h2>
          <p className="mt-3 text-ink-2">Siempre sabes dónde estás y qué sigue. Y a la derecha ves cómo va quedando tu aviso.</p>
        </Reveal>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {BLOCKS.map((b, bi) => (
            <Reveal as="li" key={b} delay={bi * 0.05}>
              <div className="h-full rounded-[24px] border border-line bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-600">{(() => { const I = BLOCK_ICON[bi] ?? Check; return <I className="h-5 w-5" strokeWidth={1.75} />; })()}</span>
                  <span className="text-[12px] font-semibold text-ink-3 tabular">{bi + 1}/{BLOCKS.length}</span>
                </div>
                <h3 className="mt-4 text-[16px] font-semibold">{b}</h3>
                <ul className="mt-2 grid gap-1 text-[13.5px] text-ink-2">
                  {stepsOfBlock(bi).map((s) => <li key={s.n}>{s.short}</li>)}
                </ul>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ------------------------------ Cierre ------------------------------- */}
      <section className="container-x pb-20 lg:pb-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] bg-brand-800 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden style={{ background: "radial-gradient(60% 80% at 15% 0%, rgba(47,168,140,.55), transparent 60%), radial-gradient(50% 70% at 90% 100%, rgba(242,181,68,.28), transparent 60%)" }} />
            <div className="relative mx-auto max-w-2xl">
              <Camera className="mx-auto h-9 w-9 text-sun" />
              <h2 className="display-md mt-4 text-white">Tu inmueble merece buenas fotos. Empecemos por ahí.</h2>
              <p className="mx-auto mt-3 max-w-lg text-white/80">Crea tu borrador en un toque y súbelas cuando quieras.</p>
              <Button href="#empezar" size="lg" variant="sun" className="mt-8">Empezar a publicar <ArrowRight className="h-5 w-5" /></Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/** Collage de fotos con detalles que anticipan la interfaz de subida (portada, contador). */
function HeroCollage() {
  const [a, b, c] = HERO_IMAGES;
  return (
    <div className="relative mx-auto w-full max-w-[640px] lg:max-w-none">
      <div className="grid aspect-[5/4] grid-cols-5 grid-rows-2 gap-3 sm:gap-4 lg:aspect-auto lg:h-[560px]">
        <div className="relative col-span-3 row-span-2">
          <Photo src={a!.src} alt={a!.alt} priority seed={1} className="h-full w-full rounded-[28px] shadow-[var(--shadow-lift)] sm:rounded-[32px]" sizes="(min-width:1024px) 34vw, 60vw" />
          <span className="absolute left-3 top-3 rounded-full bg-sun px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink shadow-md sm:left-4 sm:top-4">Foto principal</span>
          <span className="absolute bottom-3 left-3 right-3 truncate rounded-2xl bg-white/90 px-3.5 py-2 text-[12.5px] font-semibold text-ink shadow backdrop-blur sm:bottom-4 sm:left-4 sm:right-4">{a!.place}</span>
        </div>
        <Photo src={b!.src} alt={b!.alt} seed={2} className="col-span-2 h-full w-full rounded-[24px] sm:rounded-[28px]" sizes="(min-width:1024px) 22vw, 40vw" />
        <Photo src={c!.src} alt={c!.alt} seed={4} className="col-span-2 h-full w-full rounded-[24px] sm:rounded-[28px]" sizes="(min-width:1024px) 22vw, 40vw" />
      </div>
      <div className="absolute -bottom-4 right-3 flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-5 shadow-[var(--shadow-pop)] sm:right-6">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-white"><Check className="h-5 w-5" strokeWidth={3} /></span>
        <span className="text-[13.5px] leading-tight"><b className="block font-semibold">8 de 40 fotos</b><span className="text-ink-3">Tu aviso se ve completo</span></span>
      </div>
      <div className="pointer-events-none absolute -left-3 -top-3 hidden h-24 w-24 rounded-full bg-brand-100/70 blur-2xl lg:block" aria-hidden />
    </div>
  );
}
