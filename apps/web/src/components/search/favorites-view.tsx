"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { cn } from "@/lib/cn";
import { api, fetcher } from "@/lib/api";
import { formatDate, plural } from "@/lib/format";
import { OPERATION_LABEL } from "@/lib/site";
import { toast } from "@/lib/toast";
import { useFavorites } from "@/lib/favorites";
import type { AlertFrequency, Catalog, PublicationCard, SavedSearchDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { ArrowRight, Heart, Search, Trash2 } from "@/components/ui/icon";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/property-card";
import { BellRing } from "./icons";
import { useCatalog } from "./hooks";
import { buildHref } from "./query";
import { buildActiveChips } from "./results-parts";

type Tab = "guardados" | "busquedas";
const FREQ: Record<AlertFrequency, string> = { NONE: "Sin alertas", INSTANT: "Alerta al instante", DAILY: "Alerta diaria", WEEKLY: "Alerta semanal" };

function pretty(slug: string) { return slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()); }

/** Resumen legible de una búsqueda guardada. */
function describe(q: SavedSearchDTO["query"], catalog: Catalog | null) {
  const city = q.city ? (catalog?.cities.find((c) => c.slug === q.city) ?? null) : null;
  const hood = q.neighborhood ? city?.neighborhoods.find((n) => n.slug === q.neighborhood) : null;
  const where = [hood?.name ?? (q.neighborhood ? pretty(q.neighborhood) : null), city?.name ?? (q.city ? pretty(q.city) : null)].filter(Boolean).join(", ");
  const chips = buildActiveChips({ ...q, city: undefined, neighborhood: undefined }, catalog).map((c) => c.label);
  return { where, chips };
}

function Tabs({ tab, onChange, saved, searches }: { tab: Tab; onChange: (t: Tab) => void; saved: number | null; searches: { total: number | null; news: number } }) {
  const items: { v: Tab; label: string; n: number | null; badge?: number }[] = [
    { v: "guardados", label: "Guardados", n: saved },
    { v: "busquedas", label: "Búsquedas guardadas", n: searches.total, badge: searches.news },
  ];
  return (
    <div role="tablist" aria-label="Mis guardados" className="relative inline-flex gap-1 rounded-full bg-surface p-1">
      {items.map((i) => {
        const on = tab === i.v;
        return (
          <button key={i.v} role="tab" id={`tab-${i.v}`} aria-selected={on} aria-controls={`panel-${i.v}`} aria-label={i.v === "busquedas" ? "Búsquedas guardadas" : undefined} onClick={() => onChange(i.v)}
            className={cn("relative inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[14.5px] font-semibold transition-all sm:px-5", on ? "bg-white text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:text-ink")}>
            {i.v === "busquedas" ? <>Búsquedas<span className="hidden sm:inline">&nbsp;guardadas</span></> : i.label}
            {i.n != null && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular">{i.n}</span>}
            {!!i.badge && <span className="rounded-full bg-sun px-2 py-0.5 text-xs font-bold text-ink">{i.badge} {i.badge === 1 ? "nuevo" : "nuevos"}</span>}
          </button>
        );
      })}
    </div>
  );
}

function SavedGrid() {
  const { data, error, isLoading, mutate } = useSWR<PublicationCard[]>("/favorites", fetcher, { revalidateOnFocus: true });
  const { isFavorite } = useFavorites();
  if (isLoading) return <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <PropertyCardSkeleton key={i} />)}</div>;
  if (error) return <EmptyState icon={<Heart className="h-6 w-6" />} title="No pudimos cargar tus favoritos" text="Revisa tu conexión e inténtalo de nuevo." action={<Button onClick={() => void mutate()}>Reintentar</Button>} />;
  if (!data?.length) return (
    <EmptyState icon={<Heart className="h-6 w-6" />} title="Aún no has guardado inmuebles" text="Toca el corazón de cualquier anuncio para guardarlo aquí y compararlo con calma."
      action={<div className="mt-2 flex flex-wrap justify-center gap-2.5"><Button href="/venta">Explorar en venta</Button><Button href="/arriendo" variant="outline">Explorar en arriendo</Button></div>} />
  );
  return (
    <>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((it, i) => {
          const kept = isFavorite(it.id);
          return (
            <div key={it.id} className={cn("relative transition-opacity duration-300", !kept && "opacity-55")}>
              <PropertyCard item={it} priority={i < 3} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" />
              {!kept && <p className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">Quitado de favoritos</p>}
            </div>
          );
        })}
      </div>
      <p className="mt-10 text-center text-sm text-ink-3">Los inmuebles que quites seguirán visibles hasta que recargues, por si cambias de opinión.</p>
    </>
  );
}

function SavedSearchRow({ s, catalog, onDeleted }: { s: SavedSearchDTO; catalog: Catalog | null; onDeleted: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const op = s.query.operation ?? "SALE";
  const { where, chips } = useMemo(() => describe(s.query, catalog), [s.query, catalog]);
  const href = buildHref(op, s.query);
  const remove = async () => {
    setBusy(true);
    try { await api(`/saved-searches/${s.id}`, { method: "DELETE" }); onDeleted(s.id); toast.success("Búsqueda eliminada"); }
    catch { toast.error("No pudimos eliminarla. Inténtalo de nuevo."); setBusy(false); setConfirm(false); }
  };
  return (
    <li className="group relative flex flex-col gap-5 rounded-[24px] border border-line bg-white p-5 transition-shadow hover:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:p-6">
      <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-full", s.newCount > 0 ? "bg-sun-soft text-sun-ink" : "bg-brand-50 text-brand-700")}><BellRing className="h-6 w-6" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="truncate font-display text-[1.55rem] leading-tight">{s.name}</h3>
          {s.newCount > 0 && <span className="rounded-full bg-sun px-2.5 py-1 text-xs font-bold text-ink">{plural(s.newCount, "nuevo", "nuevos")}</span>}
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[14px] text-ink-2">
          <span className="font-semibold text-ink">{OPERATION_LABEL[op]}</span>
          {where && <><span aria-hidden className="text-ink-3">·</span><span>{where}</span></>}
          {chips.slice(0, 4).map((c) => <span key={c} className="rounded-full bg-surface px-2.5 py-1 text-[12.5px] font-medium">{c}</span>)}
          {chips.length > 4 && <span className="text-[12.5px] text-ink-3">+{chips.length - 4}</span>}
        </p>
        <p className="mt-2 text-[13px] text-ink-3">{FREQ[s.frequency]} · Guardada el {formatDate(s.createdAt)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {confirm ? (
          <>
            <Button variant="danger" size="sm" loading={busy} onClick={remove}>Sí, eliminar</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)} disabled={busy}>Cancelar</Button>
          </>
        ) : (
          <>
            <Button href={href} variant="dark">Ver resultados<ArrowRight className="h-4 w-4" /></Button>
            <button type="button" onClick={() => setConfirm(true)} aria-label={`Eliminar la búsqueda ${s.name}`} className="grid h-11 w-11 place-items-center rounded-full border border-line-strong text-ink-2 transition hover:border-danger hover:bg-danger-soft hover:text-danger"><Trash2 className="h-[18px] w-[18px]" /></button>
          </>
        )}
      </div>
    </li>
  );
}

function SearchesList({ initialCatalog }: { initialCatalog: Catalog | null }) {
  const { data, error, isLoading, mutate } = useSWR<SavedSearchDTO[]>("/saved-searches", fetcher, { revalidateOnFocus: true });
  const catalog = useCatalog(initialCatalog);
  if (isLoading) return <div className="grid gap-4">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-[130px] rounded-[24px]" />)}</div>;
  if (error) return <EmptyState icon={<Search className="h-6 w-6" />} title="No pudimos cargar tus búsquedas" text="Revisa tu conexión e inténtalo de nuevo." action={<Button onClick={() => void mutate()}>Reintentar</Button>} />;
  if (!data?.length) return (
    <EmptyState icon={<BellRing className="h-6 w-6" />} title="Todavía no guardas búsquedas" text="Aplica tus filtros en la búsqueda y toca “Guardar esta búsqueda”: te avisamos cuando aparezcan inmuebles nuevos."
      action={<div className="mt-2"><Button href="/venta"><Search className="h-4 w-4" />Ir a buscar</Button></div>} />
  );
  return (
    <ul className="grid grid-cols-1 gap-4">
      {data.map((s) => <SavedSearchRow key={s.id} s={s} catalog={catalog} onDeleted={(id) => void mutate((cur) => cur?.filter((x) => x.id !== id), { revalidate: false })} />)}
    </ul>
  );
}

export function FavoritesView({ initialTab, name, catalog }: { initialTab: Tab; name: string; catalog: Catalog | null }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const favs = useSWR<PublicationCard[]>("/favorites", fetcher, { revalidateOnFocus: false });
  const searches = useSWR<SavedSearchDTO[]>("/saved-searches", fetcher, { revalidateOnFocus: false });
  const change = useCallback((t: Tab) => {
    setTab(t);
    try { const u = new URL(window.location.href); if (t === "busquedas") u.searchParams.set("tab", "busquedas"); else u.searchParams.delete("tab"); window.history.replaceState(null, "", u); } catch { /* noop */ }
  }, []);
  const news = (searches.data ?? []).reduce((a, s) => a + (s.newCount || 0), 0);

  return (
    <div className="container-x pb-24 pt-[108px] md:pt-[120px]">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-3">Hola, {name}</p>
          <h1 className="display-lg text-balance">Lo que te <em className="italic">enamoró</em></h1>
          <p className="mt-3 max-w-xl text-[17px] text-ink-2">Tus inmuebles guardados y las búsquedas que seguimos por ti, en un solo lugar.</p>
        </div>
        <Tabs tab={tab} onChange={change} saved={favs.data?.length ?? null} searches={{ total: searches.data?.length ?? null, news }} />
      </header>
      <div className="mt-10" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "guardados" ? <SavedGrid /> : <SearchesList initialCatalog={catalog} />}
      </div>
    </div>
  );
}

export function FavoritesGate() {
  return (
    <div className="container-x pb-24 pt-[108px] md:pt-[130px]">
      <div className="mx-auto grid max-w-2xl place-items-center gap-5 rounded-[32px] bg-surface px-6 py-16 text-center md:px-12 md:py-20">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-heart shadow-[var(--shadow-card)]"><Heart className="h-7 w-7 fill-current" /></span>
        <h1 className="display-md text-balance">Guarda lo que te <em className="italic">enamora</em></h1>
        <p className="max-w-md text-[16.5px] leading-relaxed text-ink-2">Ingresa para ver tus inmuebles favoritos y recibir alertas cuando aparezcan nuevos que se parezcan a lo que buscas.</p>
        <div className="mt-1 flex flex-wrap justify-center gap-3"><Button href="/ingresar?next=%2Ffavoritos" size="lg">Ingresar</Button><Button href="/registro?next=%2Ffavoritos" size="lg" variant="outline">Crear cuenta</Button></div>
        <Link href="/venta" className="text-[15px] font-semibold text-brand-700 underline-offset-4 hover:underline">Seguir explorando</Link>
      </div>
    </div>
  );
}
