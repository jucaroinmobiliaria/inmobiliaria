import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatArea, formatDate, formatPrice, plural, timeAgo } from "@/lib/format";
import { SITE, STATUS_LABEL, OPERATION_LABEL, absoluteUrl } from "@/lib/site";
import type { AmenityCategory, CatalogAmenity, PublicationDetail } from "@/lib/types";
import { FavoriteButton } from "@/components/property/favorite-button";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/misc";
import { Bath, Bed, BadgeCheck, Building2, Car, Clock, Icon, Layers, MapPin, Maximize2, Pencil, TriangleAlertIcon } from "./icons-local";
import { Breadcrumbs } from "@/components/search/landing-intro";
import { buildHref } from "@/components/search/query";
import { JsonLd } from "@/components/home/json-ld";
import { LocationMap } from "@/components/map/location-map";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { Gallery } from "./gallery";
import { ContactCard } from "./contact-card";
import { MobileContactBar } from "./mobile-contact-bar";
import { ReadMore, ShareButton, ViewTracker } from "./actions";
import { ReportButton } from "./report-dialog";
import { PriceHistory } from "./price-history";

const pluralize = (n: string) => (/[aeiouáéíóú]$/i.test(n) ? `${n}s` : /z$/i.test(n) ? `${n.slice(0, -1)}ces` : `${n}es`);
const CAT_LABEL: Record<AmenityCategory, string> = { INTERIOR: "Interior", BUILDING: "Edificio y conjunto", EXTERIOR: "Exteriores", SURROUNDINGS: "Alrededores" };
const COND: Record<string, string> = { NEW: "Nuevo", USED: "Usado", OFF_PLAN: "Sobre planos" };

function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return <h2 id={id} className="display-md !text-[2rem] md:!text-[2.3rem]">{children}</h2>;
}

export function DetailView({ pub }: { pub: PublicationDetail }) {
  const op = pub.operation;
  const where = [pub.neighborhood?.name, pub.city.name].filter(Boolean).join(", ");
  const published = pub.status === "PUBLISHED";
  const st = STATUS_LABEL[pub.status];

  const crumbs = [
    { label: "Inicio", href: "/" },
    { label: OPERATION_LABEL[op], href: buildHref(op, {}) },
    { label: pluralize(pub.type.name), href: buildHref(op, { type: pub.type.slug }) },
    { label: pub.city.name, href: buildHref(op, { type: pub.type.slug, city: pub.city.slug }) },
    ...(pub.neighborhood ? [{ label: pub.neighborhood.name, href: buildHref(op, { type: pub.type.slug, city: pub.city.slug, neighborhood: pub.neighborhood.slug }) }] : []),
    { label: pub.title },
  ];

  const facts = [
    pub.bedrooms != null && { icon: <Bed className="h-5 w-5" />, v: String(pub.bedrooms), l: pub.bedrooms === 1 ? "Habitación" : "Habitaciones" },
    pub.bathrooms != null && { icon: <Bath className="h-5 w-5" />, v: String(pub.bathrooms), l: pub.bathrooms === 1 ? "Baño" : "Baños" },
    !!pub.parking && { icon: <Car className="h-5 w-5" />, v: String(pub.parking), l: pub.parking === 1 ? "Parqueadero" : "Parqueaderos" },
    pub.area != null && { icon: <Maximize2 className="h-5 w-5" />, v: formatArea(pub.area), l: "Área" },
    pub.stratum != null && { icon: <Layers className="h-5 w-5" />, v: String(pub.stratum), l: "Estrato" },
    pub.floor != null && { icon: <Building2 className="h-5 w-5" />, v: `${pub.floor}${pub.totalFloors ? ` de ${pub.totalFloors}` : ""}`, l: "Piso" },
    pub.ageYears != null && { icon: <Clock className="h-5 w-5" />, v: pub.ageYears === 0 ? "A estrenar" : plural(pub.ageYears, "año", "años"), l: "Antigüedad" },
  ].filter(Boolean) as { icon: React.ReactNode; v: string; l: string }[];

  const byCat = (Object.keys(CAT_LABEL) as AmenityCategory[]).map((c) => ({ c, items: pub.amenities.filter((a: CatalogAmenity) => a.category === c) })).filter((g) => g.items.length);

  const rows: [string, string][] = [
    ["Tipo de inmueble", pub.type.name],
    ["Estado", COND[pub.condition] ?? "—"],
    ["Amoblado", pub.furnished ? "Sí" : "No"],
    ["Mascotas", pub.petFriendly ? "Se aceptan" : "No se aceptan"],
    ...(pub.landArea ? [["Área del lote", formatArea(pub.landArea)] as [string, string]] : []),
    ...(pub.adminFee ? [["Administración", `${formatPrice(pub.adminFee)} / mes`] as [string, string]] : []),
    ...(pub.availableFrom ? [["Disponible desde", formatDate(pub.availableFrom)] as [string, string]] : []),
    ...(pub.minContractMonths ? [["Contrato mínimo", plural(pub.minContractMonths, "mes", "meses")] as [string, string]] : []),
    ["Código", `#${pub.code}`],
  ];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["RealEstateListing", "Product"], name: pub.title, url: absoluteUrl(pub.path), description: pub.description.slice(0, 500), datePosted: pub.publishedAt ?? undefined,
        image: pub.images.slice(0, 8).map((i) => i.url), sku: String(pub.code), category: `${OPERATION_LABEL[op]} · ${pub.type.name}`,
        offers: { "@type": "Offer", price: pub.price, priceCurrency: pub.currency, availability: published ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: absoluteUrl(pub.path), businessFunction: op === "RENT" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell" },
        contentLocation: { "@type": "Place", name: where, address: { "@type": "PostalAddress", addressLocality: pub.city.name, addressRegion: pub.neighborhood?.name, addressCountry: "CO" }, ...(pub.lat != null && pub.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: pub.lat, longitude: pub.lng } } : {}) },
        numberOfRooms: pub.bedrooms ?? undefined, floorSize: pub.area ? { "@type": "QuantitativeValue", value: pub.area, unitCode: "MTK" } : undefined,
        provider: { "@type": pub.advertiser.company ? "Organization" : "Person", name: pub.advertiser.company ?? pub.advertiser.name },
      },
      { "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: absoluteUrl(c.href) } : {}) })) },
    ],
  };

  return (
    <div className="pt-[68px]">
      <JsonLd data={ld} />
      <ViewTracker id={pub.id} />

      {!published && (
        <div className="border-b border-sun/40 bg-sun-soft">
          <div className="container-x flex flex-wrap items-center justify-between gap-3 py-3 text-[14px] font-medium text-sun-ink">
            <p className="flex items-center gap-2"><TriangleAlertIcon className="h-[18px] w-[18px]" />Vista previa · Este anuncio está “{st?.label ?? pub.status}” y no es visible para el público.</p>
            <Button href={`/publicar/${pub.id}`} size="sm" variant="dark"><Pencil className="h-4 w-4" />Editar anuncio</Button>
          </div>
        </div>
      )}

      <div className="container-x pb-14 pt-5 lg:pb-16">
        <Breadcrumbs items={crumbs} className="mb-4 hidden md:block" />
        <Gallery images={pub.images} title={pub.title} seed={pub.code} videoUrl={pub.videoUrl} tourUrl={pub.tourUrl} />

        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-20">
          <article className="min-w-0">
            {/* Título */}
            <header>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{pub.type.name} en {op === "SALE" ? "venta" : "arriendo"}</Badge>
                {pub.featured && <Badge tone="warn">Destacado</Badge>}
                {pub.isNew && !pub.featured && <Badge tone="info">Nuevo</Badge>}
                {pub.advertiser.verified && <Badge tone="success"><BadgeCheck className="h-3.5 w-3.5" />Verificado</Badge>}
              </div>
              <h1 className="display-md mt-4 text-balance md:!text-[2.8rem]">{pub.title}</h1>
              <p className="mt-3 flex items-center gap-2 text-[17px] text-ink-2"><MapPin className="h-5 w-5 shrink-0 text-brand-600" />{pub.address ? `${pub.address} · ` : ""}{where}</p>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-display text-[3.2rem] leading-none tracking-tight tabular md:text-[3.8rem]">
                    {formatPrice(pub.price, pub.currency)}{op === "RENT" && <span className="font-sans text-lg font-medium tracking-normal text-ink-3">/ mes</span>}
                    {pub.negotiable && <span className="rounded-full bg-sun-soft px-3 py-1 font-sans text-xs font-bold tracking-normal text-sun-ink">Negociable</span>}
                  </p>
                  {pub.adminFee ? <p className="mt-2 text-[15px] text-ink-3">+ {formatPrice(pub.adminFee)} de administración</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <ShareButton title={pub.title} text={`${pub.title} · ${formatPrice(pub.price, pub.currency)} en ${where}`} />
                  <FavoriteButton id={pub.id} variant="plain" label />
                </div>
              </div>
              <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-3">
                {pub.publishedAt && <span>Publicado {timeAgo(pub.publishedAt)}</span>}
                <span>Código #{pub.code}</span>
                {pub.viewCount > 0 && <span>{plural(pub.viewCount, "vista", "vistas")}</span>}
                {pub.favoriteCount > 0 && <span>{plural(pub.favoriteCount, "guardado", "guardados")}</span>}
              </p>
            </header>

            {/* Datos clave */}
            {facts.length > 0 && (
              <Reveal>
                <ul className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-label="Datos clave">
                  {facts.map((f) => (
                    <li key={f.l} className="flex items-center gap-3 rounded-[20px] border border-line p-3.5 sm:gap-3.5 sm:p-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 sm:h-11 sm:w-11">{f.icon}</span>
                      <span className="min-w-0"><span className="block truncate font-display text-[1.65rem] leading-none tabular">{f.v}</span><span className="mt-1 block text-[12.5px] leading-tight text-ink-3 sm:text-[13px]">{f.l}</span></span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

            {/* Descripción */}
            <section className="mt-14" aria-labelledby="descripcion">
              <SectionTitle id="descripcion">Sobre este inmueble</SectionTitle>
              <div className="mt-5"><ReadMore text={pub.description} /></div>
            </section>

            {/* Comodidades */}
            {byCat.length > 0 && (
              <section className="mt-14 border-t border-line pt-12" aria-labelledby="comodidades">
                <SectionTitle id="comodidades">Comodidades</SectionTitle>
                <div className="mt-6 grid gap-8">
                  {byCat.map((g) => (
                    <div key={g.c}>
                      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-3">{CAT_LABEL[g.c]}</h3>
                      <ul className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
                        {g.items.map((a) => <li key={a.id} className="flex items-center gap-3 text-[16px]"><span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-brand-700"><Icon name={a.icon} size={18} /></span>{a.name}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Características */}
            <section className="mt-14 border-t border-line pt-12" aria-labelledby="caracteristicas">
              <SectionTitle id="caracteristicas">Características</SectionTitle>
              <dl className="mt-6 grid gap-x-10 sm:grid-cols-2">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line py-3.5"><dt className="text-[15px] text-ink-3">{k}</dt><dd className="text-right text-[15px] font-semibold">{v}</dd></div>
                ))}
              </dl>
            </section>

            {/* Ubicación */}
            <section className="mt-14 border-t border-line pt-12" aria-labelledby="ubicacion">
              <SectionTitle id="ubicacion">Ubicación</SectionTitle>
              <p className="mt-3 flex items-center gap-2 text-[16px] text-ink-2"><MapPin className="h-[18px] w-[18px] text-brand-600" />{pub.address ? `${pub.address}, ` : ""}{where}</p>
              {pub.lat != null && pub.lng != null ? (
                <LocationMap lat={pub.lat} lng={pub.lng} approximate={pub.approximateLocation} label={where} className="mt-5 h-[340px] md:h-[400px]" />
              ) : (
                <div className="mt-5 grid h-[200px] place-items-center rounded-[24px] bg-surface text-sm text-ink-3">El anunciante no compartió la ubicación en el mapa.</div>
              )}
              {pub.approximateLocation && <p className="mt-3 text-[13px] text-ink-3">La zona marcada es aproximada. El anunciante te comparte la dirección exacta al coordinar la visita.</p>}
              <div className="mt-5 flex flex-wrap gap-2.5">
                {pub.neighborhood && <Link href={buildHref(op, { type: pub.type.slug, city: pub.city.slug, neighborhood: pub.neighborhood.slug })} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold transition hover:border-ink">Más {pluralize(pub.type.name).toLowerCase()} en {pub.neighborhood.name}</Link>}
                <Link href={buildHref(op, { type: pub.type.slug, city: pub.city.slug })} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold transition hover:border-ink">Más {pluralize(pub.type.name).toLowerCase()} en {pub.city.name}</Link>
              </div>
            </section>

            {/* Historial de precio */}
            {pub.priceHistory?.length >= 2 && (
              <section className="mt-14 border-t border-line pt-12" aria-labelledby="historial">
                <SectionTitle id="historial">Historial de precio</SectionTitle>
                <div className="mt-6 rounded-[24px] border border-line p-5 md:p-7"><PriceHistory points={pub.priceHistory} currency={pub.currency} /></div>
              </section>
            )}

            {/* Anunciante */}
            <section className="mt-14 border-t border-line pt-12" aria-labelledby="anunciante">
              <SectionTitle id="anunciante">Quién publica</SectionTitle>
              <div className="mt-6 flex flex-col gap-5 rounded-[24px] bg-surface p-6 sm:flex-row sm:items-center">
                <Avatar name={pub.advertiser.name} src={pub.advertiser.avatarUrl} size={72} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[20px] font-semibold">{pub.advertiser.name}{pub.advertiser.verified && <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700"><BadgeCheck className="h-3.5 w-3.5" />Verificado</span>}</p>
                  <p className="mt-0.5 text-[15px] text-ink-2">{pub.advertiser.company ?? (pub.advertiser.role === "AGENT" ? "Agente inmobiliario" : "Propietario")}</p>
                  <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-3"><span>Miembro desde {formatDate(pub.advertiser.memberSince, { month: "long", year: "numeric" })}</span><span>{plural(pub.advertiser.activeListings, "anuncio activo", "anuncios activos")}</span></p>
                  {pub.advertiser.bio && <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-ink-2">{pub.advertiser.bio}</p>}
                </div>
              </div>
            </section>

            <div className="mt-12 flex flex-col items-start gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><ReportButton id={pub.id} /><p className="text-[12px] text-ink-3">{SITE.name} no cobra comisión por el contacto.</p></div>
          </article>

          {/* Tarjeta de contacto (escritorio) */}
          <aside className="hidden lg:block" aria-label="Contactar al anunciante">
            <div className="sticky top-[92px]"><ContactCard pub={pub} /></div>
          </aside>
        </div>
      </div>

      {pub.similar?.length > 0 && <div className={cn("border-t border-line pb-28 lg:pb-8")}><FeaturedCarousel className="pt-14 md:pt-16" label="Inmuebles similares" idBase="similares-titulo" items={pub.similar} title="Inmuebles similares" eyebrow="Te puede interesar" text="Parecidos en zona, tipo y precio." viewAllHref={buildHref(op, { type: pub.type.slug, city: pub.city.slug })} viewAllLabel="Ver más inmuebles" /></div>}
      {!(pub.similar?.length > 0) && <div className="h-20 lg:hidden" aria-hidden />}
      <MobileContactBar pub={pub} />
    </div>
  );
}
