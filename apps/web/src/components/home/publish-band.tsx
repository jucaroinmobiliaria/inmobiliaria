import { PUBLISH_BAND_IMAGE, HERO_IMAGES } from "@/lib/images";
import type { PublicationCard } from "@/lib/types";
import { Photo } from "@/components/ui/photo";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/misc";
import { PropertyCard } from "@/components/property/property-card";
import { ArrowRight, Check } from "@/components/ui/icon";

const BENEFITS = ["Publicar es gratis, sin letra pequeña", "Fotos en grande, mapa y video en un solo anuncio", "Recibes mensajes y visitas directo en tu panel"];

const MOCK: PublicationCard = {
  id: "mock", code: 1024, slug: "mock", path: "/publicar", title: "Apartamento luminoso con balcón", operation: "SALE", status: "PUBLISHED",
  price: 480_000_000, currency: "COP", negotiable: true, adminFee: 520_000, type: { slug: "apartamento", name: "Apartamento" }, condition: "USED",
  area: 86, bedrooms: 3, bathrooms: 2, parking: 1, stratum: 4, city: { slug: "medellin", name: "Medellín" }, neighborhood: { slug: "laureles", name: "Laureles" },
  address: null, lat: null, lng: null, approximateLocation: true, coverUrl: HERO_IMAGES[2]!.src,
  images: [{ id: "m1", url: HERO_IMAGES[2]!.src, width: null, height: null, position: 0, isCover: true, roomLabel: null, caption: null, status: "READY" }],
  imageCount: 12, featured: true, isNew: true, hasVideo: true, hasTour: false, publishedAt: null, isFavorite: false,
  advertiser: { id: "x", name: "Tú", avatarUrl: null, verified: true, company: null, role: "OWNER" },
};

export function PublishBand() {
  return (
    <section className="mt-24 md:mt-32" aria-labelledby="publicar-titulo">
      <div className="relative isolate overflow-hidden bg-brand-900 py-20 text-white md:py-28">
        <Photo src={PUBLISH_BAND_IMAGE} alt="" seed={1} sizes="100vw" widths={[800, 1400, 1800]} className="absolute inset-0 -z-10 opacity-25 mix-blend-luminosity" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-900 via-brand-900/85 to-brand-900/30" aria-hidden />
        <div className="container-x grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal>
            <p className="eyebrow mb-4 !text-brand-200">Para propietarios y agentes</p>
            <h2 id="publicar-titulo" className="display-lg max-w-[14ch] text-balance">Publica tu inmueble en <em className="italic text-[#ffe6b0]">minutos</em></h2>
            <ul className="mt-8 grid gap-3.5">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-3 text-[17px] text-white/90"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500/90 text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>{b}</li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button href="/publicar" size="lg" variant="sun">Empezar a publicar<ArrowRight className="h-5 w-5" /></Button>
              <Button href="/ayuda#publicar" size="lg" variant="ghost" className="text-white hover:bg-white/10">Cómo funciona</Button>
            </div>
          </Reveal>
          <Reveal delay={0.15} y={40} className="hidden lg:block">
            <div className="relative mx-auto w-full max-w-[380px]">
              <div className="absolute -inset-6 rounded-[40px] bg-brand-500/20 blur-2xl" aria-hidden />
              <div className="animate-float -rotate-2 rounded-[28px] bg-white p-3 text-ink shadow-[var(--shadow-pop)]">
                <PropertyCard item={MOCK} preview sizes="380px" />
              </div>
              <div className="absolute -bottom-6 -right-6 flex items-center gap-2.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-[var(--shadow-lift)]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-success-soft text-success"><Check className="h-4 w-4" strokeWidth={3} /></span>Publicado en 6 min
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
