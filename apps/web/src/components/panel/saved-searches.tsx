"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api, qs } from "@/lib/api";
import { formatDate, formatPriceShort } from "@/lib/format";
import { OPERATION_SLUG } from "@/lib/site";
import { toast } from "@/lib/toast";
import type { AlertFrequency, Catalog, SavedSearchDTO, SearchQuery } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Skeleton } from "@/components/ui/misc";
import { ArrowRight, Bell, Bookmark, Search, Trash2 } from "@/components/ui/icon";
import { ConfirmDialog, ErrorState, PageHeader, errText, useAction, useData } from "./common";

const FREQ: Record<AlertFrequency, string> = { NONE: "Sin alertas", INSTANT: "Alerta al instante", DAILY: "Alerta diaria", WEEKLY: "Alerta semanal" };
const COND = { NEW: "Nuevo", USED: "Usado", OFF_PLAN: "Sobre planos" } as const;

const pretty = (slug: string) => slug.split("-").map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(" ");
const list = (s?: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);

/** Construye el enlace de búsqueda (/venta?… o /arriendo?…) a partir de la consulta guardada. */
export function searchHref(q: SearchQuery) {
  const { operation, page: _p, pageSize: _s, ...rest } = q;
  void _p; void _s;
  return `/${OPERATION_SLUG[operation ?? "SALE"]}${qs(rest as Record<string, unknown>)}`;
}

function describe(q: SearchQuery, cat?: Catalog) {
  const typeNames = list(q.type).map((s) => cat?.types.find((t) => t.slug === s)?.pluralName ?? pretty(s));
  const city = q.city ? cat?.cities.find((c) => c.slug === q.city) : undefined;
  const hoods = list(q.neighborhood).map((s) => city?.neighborhoods.find((n) => n.slug === s)?.name ?? cat?.cities.flatMap((c) => c.neighborhoods).find((n) => n.slug === s)?.name ?? pretty(s));
  const op = q.operation === "RENT" ? "en arriendo" : "en venta";
  const head = `${typeNames.length ? typeNames.join(" y ") : "Inmuebles"} ${op}`;
  const parts: string[] = [head];
  if (q.city) parts.push(city?.name ?? pretty(q.city));
  if (hoods.length) parts.push(hoods.join(", "));
  const nb = (t: string) => t.replace(/\s/g, "\u00a0");
  if (q.minPrice && q.maxPrice) parts.push(nb(`${formatPriceShort(q.minPrice)} a ${formatPriceShort(q.maxPrice)}`));
  else if (q.maxPrice) parts.push(nb(`hasta ${formatPriceShort(q.maxPrice)}`));
  else if (q.minPrice) parts.push(nb(`desde ${formatPriceShort(q.minPrice)}`));
  if (q.bedrooms) parts.push(`${q.bedrooms}+ hab.`);
  if (q.bathrooms) parts.push(`${q.bathrooms}+ baños`);
  if (q.parking) parts.push(`${q.parking}+ parq.`);
  if (q.minArea && q.maxArea) parts.push(`${q.minArea}–${q.maxArea} m²`);
  else if (q.minArea) parts.push(`desde ${q.minArea} m²`);
  else if (q.maxArea) parts.push(`hasta ${q.maxArea} m²`);
  if (q.stratum) parts.push(`estrato ${list(q.stratum).join(", ")}`);
  if (q.condition) parts.push(COND[q.condition]);
  if (q.furnished) parts.push("amoblado");
  if (q.petFriendly) parts.push("admite mascotas");
  if (q.withVideo) parts.push("con video");
  if (q.withTour) parts.push("con tour 360°");
  if (q.featured) parts.push("destacados");
  if (q.amenities) parts.push(list(q.amenities).map((s) => cat?.amenities.find((a) => a.slug === s)?.name ?? pretty(s)).join(", "));
  if (q.q) parts.push(`«${q.q}»`);
  return { head, parts };
}

export function SavedSearches() {
  const { data, error, isLoading, mutate } = useData<SavedSearchDTO[]>("/saved-searches");
  const { data: catalog } = useData<Catalog>("/catalog");
  const [del, setDel] = useState<SavedSearchDTO | null>(null);
  const { busy, run } = useAction();
  const totalNew = useMemo(() => data?.reduce((a, s) => a + s.newCount, 0) ?? 0, [data]);

  const remove = (s: SavedSearchDTO) => run(async () => {
    const apply = (rows?: SavedSearchDTO[]) => (rows ?? []).filter((r) => r.id !== s.id);
    try {
      await mutate(async (cur) => { await api(`/saved-searches/${s.id}`, { method: "DELETE" }); return apply(cur); }, { optimisticData: (cur) => apply(cur), rollbackOnError: true, populateCache: true, revalidate: false });
      toast.success("Búsqueda eliminada");
      setDel(null);
    } catch (e) { toast.error(errText(e)); }
  });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader eyebrow="Mi panel" title="Búsquedas guardadas"
        description={totalNew > 0 ? `Hay ${totalNew} ${totalNew === 1 ? "inmueble nuevo" : "inmuebles nuevos"} que coinciden con tus búsquedas.` : "Guarda una búsqueda y te avisamos cuando aparezcan inmuebles que coincidan."}
        actions={<Button href="/venta" variant="outline"><Search className="h-[18px] w-[18px]" />Nueva búsqueda</Button>} />

      {error && !data ? <ErrorState error={error} onRetry={() => void mutate()} />
        : isLoading && !data ? <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-[20px]" />)}</div>
        : !data?.length ? (
          <EmptyState icon={<Bookmark className="h-6 w-6" />} title="Aún no guardas búsquedas" text="Aplica filtros en el buscador y toca «Guardar búsqueda»: te avisaremos por correo cuando haya inmuebles nuevos."
            action={<Button href="/venta"><Search className="h-[18px] w-[18px]" />Explorar inmuebles</Button>} />
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
            {data.map((s) => {
              const d = describe(s.query, catalog);
              return (
                <li key={s.id} className="card card-lift flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-1 text-lg font-semibold">{s.name}</h2>
                      <p className="mt-0.5 text-xs text-ink-3">Guardada el {formatDate(s.createdAt)}</p>
                    </div>
                    {s.newCount > 0 && <Badge tone="success" className="shrink-0"><span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />{s.newCount} {s.newCount === 1 ? "nuevo" : "nuevos"}</Badge>}
                  </div>
                  <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-2">
                    <strong className="font-semibold text-ink">{d.head}</strong>{d.parts.slice(1).map((p, i) => <span key={i}> · {p}</span>)}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    <Badge tone="neutral"><Bell className="h-3 w-3" />{FREQ[s.frequency]}</Badge>
                    <div className="ml-auto flex items-center gap-2">
                      <Button size="icon-sm" variant="ghost" aria-label={`Eliminar la búsqueda ${s.name}`} onClick={() => setDel(s)} className="text-ink-3 hover:!bg-danger-soft hover:!text-danger"><Trash2 className="h-[18px] w-[18px]" /></Button>
                      <Button size="sm" href={searchHref(s.query)}>Ver resultados<ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      <p className="text-sm text-ink-3">También puedes ver tus <Link href="/favoritos" className="font-semibold text-brand-700 hover:underline">inmuebles favoritos</Link>.</p>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="¿Eliminar esta búsqueda?" description={<>Dejarás de recibir alertas de «{del?.name}». Podrás volver a guardarla desde el buscador.</>}
        confirmLabel="Eliminar" loading={busy} onConfirm={() => void remove(del!)} />
    </div>
  );
}
