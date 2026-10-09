import type { Metadata } from "next";
import { apiServer } from "@/lib/server";
import { SITE, absoluteUrl } from "@/lib/site";
import type { HomeData, SuggestItem } from "@/lib/types";
import { Reveal } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/home/hero";
import { TrustMarquee } from "@/components/home/trust-marquee";
import { CategoryTiles } from "@/components/home/category-tiles";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { CitiesBento } from "@/components/home/cities-bento";
import { LatestTabs } from "@/components/home/latest-tabs";
import { HowItWorks } from "@/components/home/how-it-works";
import { PublishBand } from "@/components/home/publish-band";
import { FaqAccordion } from "@/components/home/faq";
import { FAQ } from "@/components/home/faq-data";
import { JsonLd } from "@/components/home/json-ld";
import { SectionHeader } from "@/components/home/section-header";
import { HERO_IMAGES } from "@/lib/images";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — ${SITE.tagline}` },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: SITE.url, title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description, locale: SITE.locale, siteName: SITE.name, images: [{ url: HERO_IMAGES[0]!.src, width: 1600, height: 900, alt: HERO_IMAGES[0]!.alt }] },
  twitter: { card: "summary_large_image", title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description, images: [HERO_IMAGES[0]!.src] },
};

const FALLBACK_TYPES = [
  { slug: "apartamento", name: "Apartamento", pluralName: "Apartamentos" }, { slug: "casa", name: "Casa", pluralName: "Casas" },
  { slug: "finca", name: "Finca", pluralName: "Fincas" }, { slug: "oficina", name: "Oficina", pluralName: "Oficinas" },
  { slug: "local", name: "Local", pluralName: "Locales" }, { slug: "lote", name: "Lote", pluralName: "Lotes" },
];

async function loadHome(): Promise<HomeData | null> {
  try {
    const h = await apiServer<HomeData>("/home", { revalidate: 60, tags: ["home"] });
    return h && typeof h === "object" ? h : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const home = await loadHome();
  const featured = home?.featured?.length ? home.featured : [...(home?.latestSale ?? []), ...(home?.latestRent ?? [])];
  const types = home?.types?.length ? home.types : FALLBACK_TYPES.map((t) => ({ ...t, icon: "home", count: 0 }));
  const popular: SuggestItem[] = (home?.cities ?? []).slice(0, 6).map((c) => ({ kind: "city", label: c.name, sublabel: c.department, city: c.slug }));

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Organization", "@id": `${SITE.url}/#org`, name: SITE.name, url: SITE.url, logo: absoluteUrl("/icon.svg"), email: SITE.email, areaServed: "CO", description: SITE.description },
          { "@type": "WebSite", "@id": `${SITE.url}/#site`, url: SITE.url, name: SITE.name, inLanguage: "es-CO", publisher: { "@id": `${SITE.url}/#org` },
            potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/venta?q={search_term_string}` }, "query-input": "required name=search_term_string" } },
        ],
      }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />

      <Hero totals={home?.totals ?? null} types={types.map((t) => ({ slug: t.slug, name: t.name, pluralName: t.pluralName }))} popular={popular} />
      <TrustMarquee />
      {home ? (
        <>
          <CategoryTiles types={home.types ?? []} />
          <FeaturedCarousel items={featured} />
          <CitiesBento cities={home.cities ?? []} />
          <LatestTabs sale={home.latestSale ?? []} rent={home.latestRent ?? []} />
        </>
      ) : (
        <section className="container-x pt-24">
          <div className="rounded-[28px] bg-surface p-10 text-center md:p-16">
            <p className="eyebrow mb-3">Estamos al día en un momento</p>
            <h2 className="display-md text-balance">No pudimos cargar los anuncios ahora mismo</h2>
            <p className="mx-auto mt-3 max-w-md text-ink-2">Puedes seguir explorando la búsqueda o intentarlo de nuevo en unos segundos.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3"><Button href="/venta">Explorar inmuebles</Button><Button href="/" variant="outline">Reintentar</Button></div>
          </div>
        </section>
      )}
      <HowItWorks />
      <PublishBand />
      <section className="container-x pt-24 md:pt-32" aria-labelledby="faq-titulo">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.4fr] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeader eyebrow="Preguntas frecuentes" title={<span id="faq-titulo">Todo lo que querías <em className="italic">saber</em></span>} text="Si no encuentras tu respuesta, escríbenos desde el centro de ayuda." action={undefined} />
            <Button href="/ayuda" variant="outline" className="mt-7">Ir al centro de ayuda</Button>
          </Reveal>
          <Reveal delay={0.1}><FaqAccordion /></Reveal>
        </div>
      </section>
    </>
  );
}
