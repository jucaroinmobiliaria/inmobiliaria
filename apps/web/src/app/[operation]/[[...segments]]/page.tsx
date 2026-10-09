import { cache } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { apiServer, apiServerOrNull } from "@/lib/server";
import { ApiException, qs } from "@/lib/api";
import { OPERATION_LABEL, SITE, absoluteUrl, slugToOperation } from "@/lib/site";
import type { Catalog, LandingData, Operation, PublicationDetail, SearchResult } from "@/lib/types";
import { DetailView } from "@/components/detail/detail-view";
import { SearchExperience } from "@/components/search/search-experience";
import { LandingIntro, RelatedSearches, landingCrumbs } from "@/components/search/landing-intro";
import { queryFromUrl, toApiQuery } from "@/components/search/query";

type Params = { operation: string; segments?: string[] };
type SP = Record<string, string | string[] | undefined>;

const CODE_RE = /-(\d+)$/;
const SLUG_RE = /^[a-z0-9-]+$/;

/** Ficha pública (cacheada); si no existe o no está publicada, intenta como dueño/admin para las vistas previas. */
const getDetail = cache(async (code: string): Promise<PublicationDetail | null> => {
  const pub = await apiServerOrNull<PublicationDetail>(`/publications/by-code/${code}`, { revalidate: 60, tags: [`pub-${code}`] });
  if (pub) return pub;
  const jar = await cookies();
  if (!jar.get("access_token") && !jar.get("refresh_token")) return null;
  try { return await apiServerOrNull<PublicationDetail>(`/publications/by-code/${code}`, { auth: true }); } catch { return null; }
});

const tryApi = async <T,>(fn: () => Promise<T | null>): Promise<{ data: T | null; failed: boolean }> => {
  try { return { data: await fn(), failed: false }; } catch (e) { return { data: null, failed: !(e instanceof ApiException && e.status === 404) }; }
};

const getCatalog = cache(() => tryApi(() => apiServer<Catalog>("/catalog", { revalidate: 300 })).then((r) => r.data));

const getLanding = cache(async (op: Operation, type?: string, city?: string, neighborhood?: string) =>
  tryApi(() => apiServerOrNull<LandingData>("/landing", { query: { operation: op, type, city, neighborhood }, revalidate: 300 })));

function check(operation: string, segments: string[]) {
  const op = slugToOperation(operation) as Operation | null;
  if (!op) notFound();
  const isDetail = segments.length > 0 && CODE_RE.test(segments[segments.length - 1]!);
  if (!isDetail && (segments.length > 3 || segments.some((s) => s !== "-" && !SLUG_RE.test(s)))) notFound();
  return { op: op!, isDetail };
}

export async function generateMetadata({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SP> }): Promise<Metadata> {
  const { operation, segments = [] } = await params;
  const { op, isDetail } = check(operation, segments);

  if (isDetail) {
    const code = segments[segments.length - 1]!.match(CODE_RE)![1]!;
    const pub = await getDetail(code);
    if (!pub) return { title: "Inmueble no encontrado", robots: { index: false } };
    const where = [pub.neighborhood?.name, pub.city.name].filter(Boolean).join(", ");
    const desc = `${pub.type.name} en ${OPERATION_LABEL[pub.operation].toLowerCase()} en ${where}. ${[pub.bedrooms != null ? `${pub.bedrooms} hab.` : "", pub.bathrooms != null ? `${pub.bathrooms} baños` : "", pub.area ? `${Math.round(pub.area)} m²` : ""].filter(Boolean).join(" · ")}. ${pub.description}`.replace(/\s+/g, " ").slice(0, 158);
    const img = pub.images[0]?.url ?? pub.coverUrl ?? undefined;
    return {
      title: `${pub.title} · ${where}`, description: desc, alternates: { canonical: pub.path },
      robots: pub.status === "PUBLISHED" ? { index: true, follow: true } : { index: false, follow: false },
      openGraph: { type: "article", url: absoluteUrl(pub.path), title: pub.title, description: desc, siteName: SITE.name, locale: SITE.locale, images: img ? [{ url: img, alt: pub.title }] : undefined },
      twitter: { card: "summary_large_image", title: pub.title, description: desc, images: img ? [img] : undefined },
    };
  }

  const sp = await searchParams;
  const q = queryFromUrl(operation, segments, sp);
  const { data: landing } = await getLanding(op, q.type, q.city, q.neighborhood);
  const title = landing?.title ?? `Inmuebles en ${OPERATION_LABEL[op].toLowerCase()} en Colombia`;
  const description = (landing?.intro ?? `Explora inmuebles en ${OPERATION_LABEL[op].toLowerCase()} en Colombia con fotos reales, mapa y contacto directo.`).slice(0, 158);
  const canonical = `/${[operation, ...segments].join("/")}`;
  const filtered = Object.keys(sp).length > 0;
  return {
    title, description, alternates: { canonical },
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { type: "website", url: absoluteUrl(canonical), title, description, siteName: SITE.name, locale: SITE.locale },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SP> }) {
  const { operation, segments = [] } = await params;
  const { op, isDetail } = check(operation, segments);

  /* ---------- Ficha ---------- */
  if (isDetail) {
    const code = segments[segments.length - 1]!.match(CODE_RE)![1]!;
    const pub = await getDetail(code);
    if (!pub) notFound();
    const requested = `/${[operation, ...segments].join("/")}`.toLowerCase();
    if (pub.path && pub.path.toLowerCase() !== requested) permanentRedirect(pub.path);
    return <DetailView pub={pub} />;
  }

  /* ---------- Resultados / landing SEO ---------- */
  const sp = await searchParams;
  const query = queryFromUrl(operation, segments, sp);
  const key = `/publications${qs(toApiQuery(query))}`;
  const [{ data: initial }, landingRes, catalog] = await Promise.all([
    tryApi(() => apiServer<SearchResult>("/publications", { query: toApiQuery(query), revalidate: 60 })),
    getLanding(op, query.type, query.city, query.neighborhood),
    getCatalog(),
  ]);
  // Landing con tipo/ciudad/barrio inexistente => 404 real
  if (segments.length > 0 && !landingRes.data && !landingRes.failed) notFound();
  const landing = landingRes.data;

  const crumbs = landingCrumbs(op, landing, { type: query.type, city: query.city, neighborhood: query.neighborhood });
  const fallbackTitle = `Inmuebles en ${OPERATION_LABEL[op].toLowerCase()} en Colombia`;
  const listLd = initial?.items?.length ? {
    "@context": "https://schema.org", "@type": "ItemList", name: landing?.title ?? fallbackTitle,
    itemListElement: initial.items.slice(0, 20).map((it, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(it.path), name: it.title })),
  } : null;

  return (
    <div className="pt-[68px]">
      {listLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd).replace(/</g, "\\u003c") }} />}
      <SearchExperience
        initial={initial} initialKey={key} catalog={catalog} landing={landing}
        intro={<LandingIntro landing={landing} operation={op} fallbackTitle={fallbackTitle} crumbs={crumbs} />}
        outro={<RelatedSearches landing={landing} />}
      />
    </div>
  );
}

