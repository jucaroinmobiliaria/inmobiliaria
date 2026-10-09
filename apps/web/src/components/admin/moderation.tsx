"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatArea, formatDate, formatNumber, formatPrice, formatPriceShort, timeAgo, whatsappLink } from "@/lib/format";
import { formatPhoneDisplay } from "@/lib/phone";
import { OPERATION_LABEL, STATUS_LABEL } from "@/lib/site";
import { toast } from "@/lib/toast";
import type { AdminPublicationRow, LandingData, Paginated, PublicationDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, Skeleton } from "@/components/ui/misc";
import { Photo } from "@/components/ui/photo";
import {
  ArrowLeft, BadgeCheck, Bath, Bed, Car, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, ExternalLink, Icon, Keyboard, MapPin, Phone, Ruler, Sparkles, Check, X, ListChecks, WhatsAppIcon,
} from "@/components/ui/icon";
import { ErrorState, PageHeader, errText, pct, useAction, useData } from "@/components/panel/common";
import { burst } from "@/components/motion/gestures";
import { FeatureDialog, RejectDialog } from "./dialogs";

const QUEUE_KEY = "/admin/publications?status=PENDING_REVIEW&pageSize=50";
type Row = AdminPublicationRow;

const ageTone = (iso: string) => {
  const h = (Date.now() - new Date(iso).getTime()) / 3600_000;
  return h > 48 ? "text-danger" : h > 24 ? "text-sun-ink" : "text-ink-3";
};

export function Moderation() {
  const router = useRouter();
  const sp = useSearchParams();
  const paramId = sp.get("id");
  const { data, error, isLoading, mutate } = useData<Paginated<Row>>(QUEUE_KEY, { refreshInterval: 30_000 });
  const items = useMemo(() => [...(data?.items ?? [])].sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt)), [data]);
  const [sel, setSel] = useState<string | null>(paramId);
  const [mobileDetail, setMobileDetail] = useState(!!paramId);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);
  const { busy, run } = useAction();

  const selId = sel ?? items[0]?.id ?? null;
  const selIdx = items.findIndex((i) => i.id === selId);
  const row = selIdx >= 0 ? items[selIdx]! : null;

  useEffect(() => { if (paramId) { setSel(paramId); setMobileDetail(true); } }, [paramId]);

  const choose = useCallback((id: string | null, detail = true) => {
    setSel(id);
    if (detail) setMobileDetail(true);
    router.replace(id ? `/admin/moderacion?id=${id}` : "/admin/moderacion", { scroll: false });
  }, [router]);

  const move = useCallback((d: 1 | -1) => {
    if (!items.length) return;
    const i = selIdx < 0 ? 0 : Math.min(items.length - 1, Math.max(0, selIdx + d));
    choose(items[i]!.id, false);
    document.getElementById(`q-${items[i]!.id}`)?.scrollIntoView({ block: "nearest" });
  }, [items, selIdx, choose]);

  /** Quita la publicación de la cola (optimista), ejecuta la petición y pasa a la siguiente. */
  const resolve = useCallback((id: string, title: string, request: () => Promise<unknown>, success: string) =>
    run(async () => {
      const nextId = items[selIdx + 1]?.id ?? items[selIdx - 1]?.id ?? null;
      const drop = (cur?: Paginated<Row>) => (cur ? { ...cur, total: Math.max(0, cur.total - 1), items: cur.items.filter((i) => i.id !== id) } : cur);
      try {
        await mutate(async (cur) => { await request(); return drop(cur); }, { optimisticData: (cur) => drop(cur) as Paginated<Row>, rollbackOnError: true, populateCache: true, revalidate: true });
        toast.success(`${success}: «${title.length > 40 ? `${title.slice(0, 40)}…` : title}»`);
        void globalMutate("/admin/overview");
        if (id === selId) { setSel(nextId); if (!nextId) setMobileDetail(false); router.replace(nextId ? `/admin/moderacion?id=${nextId}` : "/admin/moderacion", { scroll: false }); }
        setRejectOpen(false);
      } catch (e) { toast.error(errText(e)); }
    }), [run, items, selIdx, mutate, selId, router]);

  const approve = useCallback(() => {
    if (!selId || busy) return;
    const title = row?.title ?? "Publicación";
    void resolve(selId, title, () => api(`/admin/publications/${selId}/approve`, { method: "POST" }), "Aprobada");
  }, [selId, row, busy, resolve]);

  const reject = (reason: string) => {
    if (!selId) return;
    void resolve(selId, row?.title ?? "Publicación", () => api(`/admin/publications/${selId}/reject`, { method: "POST", body: { reason } }), "Rechazada");
  };

  const feature = (v: { featured: boolean; days?: number }) => {
    if (!selId) return;
    void run(async () => {
      try {
        await api(`/admin/publications/${selId}/feature`, { method: "PATCH", body: v });
        toast.success(v.featured ? `Destacada por ${v.days} días` : "Ya no está destacada");
        setFeatureOpen(false);
        void globalMutate(`/publications/${selId}`);
        void mutate();
      } catch (e) { toast.error(errText(e)); }
    });
  };

  // Atajos de teclado (A aprobar · R rechazar · F destacar · J/K navegar)
  const latest = useRef({ approve, move });
  latest.current = { approve, move };
  const flags = useRef({ selId, rejectOpen, featureOpen });
  flags.current = { selId, rejectOpen, featureOpen };
  const openers = useRef({ setRejectOpen, setFeatureOpen });
  // Al cambiar de publicación (J/K, aprobar, rechazar) el detalle empieza desde arriba.
  const firstSel = useRef(true);
  useEffect(() => {
    if (firstSel.current) { firstSel.current = false; return; }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [selId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const k = e.key.toLowerCase();
      const f = flags.current;
      if (k === "j") { e.preventDefault(); latest.current.move(1); }
      else if (k === "k") { e.preventDefault(); latest.current.move(-1); }
      else if (k === "a" && f.selId) { e.preventDefault(); latest.current.approve(); }
      else if (k === "r" && f.selId) { e.preventDefault(); openers.current.setRejectOpen(true); }
      else if (k === "f" && f.selId) { e.preventDefault(); openers.current.setFeatureOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const total = data?.total ?? items.length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <PageHeader eyebrow="Administración" title="Moderación"
        description={isLoading && !data ? "Cargando cola…" : items.length ? `${total} ${total === 1 ? "publicación espera" : "publicaciones esperan"} revisión. Las más antiguas aparecen primero.` : "Cola de revisión de publicaciones nuevas."}
        actions={<Shortcuts />} />

      {error && !data ? <ErrorState error={error} onRetry={() => void mutate()} />
        : isLoading && !data ? <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[340px_minmax(0,1fr)]"><Skeleton className="h-[520px] rounded-[20px]" /><Skeleton className="h-[640px] rounded-[20px]" /></div>
        : items.length === 0 && !paramId ? (
          <EmptyState icon={<CircleCheck className="h-7 w-7" />} title="Todo al día" text="No hay publicaciones esperando revisión. Cuando alguien envíe un aviso nuevo aparecerá aquí."
            action={<div className="flex flex-wrap justify-center gap-2"><Button href="/admin/publicaciones" variant="outline">Ver todas las publicaciones</Button><Button href="/admin/reportes" variant="outline">Revisar reportes</Button></div>} />
        ) : (
          <div className="grid items-start grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            {/* Cola */}
            <aside aria-label="Cola de revisión" className={cn("card overflow-hidden xl:sticky xl:top-[88px] xl:block", mobileDetail ? "hidden" : "block")}>
              <div className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4 text-ink-3" />En cola<span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular">{items.length}</span></h2></div>
              <ul className="max-h-[calc(100dvh-14rem)] overflow-y-auto" role="listbox" aria-label="Publicaciones por revisar">
                {items.map((i) => (
                  <li key={i.id} role="option" aria-selected={i.id === selId}>
                    <button id={`q-${i.id}`} type="button" onClick={() => choose(i.id)}
                      className={cn("relative flex w-full gap-3 border-b border-line/70 p-3 text-left transition-colors hover:bg-surface/70", i.id === selId && "bg-brand-50/70")}>
                      {i.id === selId && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-600" />}
                      <div className="relative h-[60px] w-[78px] shrink-0 overflow-hidden rounded-xl"><Photo src={i.coverUrl} alt="" seed={i.code} className="h-full w-full" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold">{i.title || "Sin título"}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-2">{i.owner.name}{i.owner.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-label="Verificado" />}</p>
                        <p className="mt-1 flex items-center gap-2 text-[11px]"><span className={cn("font-semibold", ageTone(i.updatedAt))}>{timeAgo(i.updatedAt)}</span><span className="text-ink-3">· {formatPriceShort(i.price, i.currency)}</span><span className="ml-auto font-semibold text-ink-2 tabular">{pct(i.completion)}%</span></p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            {/* Detalle */}
            <div className={cn("min-w-0 xl:block", mobileDetail ? "block" : "hidden")}>
              <button type="button" onClick={() => setMobileDetail(false)} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 xl:hidden"><ArrowLeft className="h-4 w-4" />Volver a la cola</button>
              {selId ? (
                <ReviewPanel key={selId} id={selId} row={row} busy={busy} onApprove={approve} onReject={() => setRejectOpen(true)} onFeature={() => setFeatureOpen(true)} onNext={() => move(1)} onPrev={() => move(-1)} hasNext={selIdx < items.length - 1} hasPrev={selIdx > 0} />
              ) : <EmptyState icon={<CircleCheck className="h-7 w-7" />} title="Cola completada" text="Revisaste todo lo pendiente. ¡Buen trabajo!" />}
            </div>
          </div>
        )}

      <RejectDialog open={rejectOpen} title={row?.title ?? "esta publicación"} onClose={() => setRejectOpen(false)} onSubmit={reject} loading={busy} />
      <FeatureDialog open={featureOpen} title={row?.title ?? "esta publicación"} featured={!!row?.featured} onClose={() => setFeatureOpen(false)} onSubmit={feature} loading={busy} />
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="grid h-6 min-w-6 place-items-center rounded-md border border-line-strong bg-white px-1.5 font-sans text-[11px] font-bold text-ink-2 shadow-[0_1px_0_rgb(14_21_18/0.12)]">{children}</kbd>;
}

function Shortcuts() {
  return (
    <div className="hidden flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface px-4 py-2.5 text-xs text-ink-2 md:flex" aria-label="Atajos de teclado">
      <Keyboard className="h-4 w-4 text-ink-3" aria-hidden />
      <span className="flex items-center gap-1.5"><Kbd>A</Kbd>aprobar</span>
      <span className="flex items-center gap-1.5"><Kbd>R</Kbd>rechazar</span>
      <span className="flex items-center gap-1.5"><Kbd>F</Kbd>destacar</span>
      <span className="flex items-center gap-1.5"><Kbd>J</Kbd><Kbd>K</Kbd>siguiente / anterior</span>
    </div>
  );
}

/* ------------------------------------------------------------- Panel de revisión */

function ReviewPanel({ id, row, busy, onApprove, onReject, onFeature, onNext, onPrev, hasNext, hasPrev }: {
  id: string; row: Row | null; busy: boolean; onApprove: () => void; onReject: () => void; onFeature: () => void; onNext: () => void; onPrev: () => void; hasNext: boolean; hasPrev: boolean;
}) {
  const { data: d, error, isLoading, mutate } = useData<PublicationDetail>(`/publications/${id}`);
  const [img, setImg] = useState(0);

  const scope = d ? `operation=${d.operation === "RENT" ? "RENT" : "SALE"}&type=${d.type.slug}&city=${d.city.slug}` : null;
  const { data: hoodZone } = useData<LandingData>(scope && d?.neighborhood ? `/landing?${scope}&neighborhood=${d.neighborhood.slug}` : null);
  const needCity = !!scope && (!d?.neighborhood || (hoodZone != null && (hoodZone.averagePricePerM2 == null || hoodZone.total < 3)));
  const { data: cityZone } = useData<LandingData>(needCity ? `/landing?${scope}` : null);

  if (error && !d) return <ErrorState error={error} onRetry={() => void mutate()} />;
  if (isLoading && !d) return <div className="grid grid-cols-[minmax(0,1fr)] gap-4"><Skeleton className="aspect-[16/9] w-full rounded-[20px]" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40 rounded-[20px]" /></div>;
  if (!d) return null;

  const imgs = d.images.length ? d.images : [];
  const cur = imgs[Math.min(img, Math.max(0, imgs.length - 1))];
  const st = STATUS_LABEL[d.status] ?? { label: d.status, tone: "neutral" as const };
  const zone = hoodZone && hoodZone.averagePricePerM2 != null && hoodZone.total >= 3 ? { z: hoodZone, name: d.neighborhood?.name ?? d.city.name } : cityZone && cityZone.averagePricePerM2 != null ? { z: cityZone, name: d.city.name } : null;
  const ppm = d.area && d.area > 0 ? d.price / d.area : null;
  const diff = zone && ppm && zone.z.averagePricePerM2 ? Math.round(((ppm - zone.z.averagePricePerM2) / zone.z.averagePricePerM2) * 100) : null;
  const lowRes = imgs.filter((i) => i.width && i.width < 800).length;

  const checks = [
    { ok: imgs.length >= 5, text: `${imgs.length} ${imgs.length === 1 ? "foto" : "fotos"}${imgs.length < 5 ? " (se recomiendan 5 o más)" : ""}` },
    { ok: lowRes === 0, text: lowRes ? `${lowRes} con baja resolución` : "Resolución de fotos adecuada" },
    { ok: d.description.trim().length >= 120, text: `Descripción de ${d.description.trim().length} caracteres` },
    { ok: d.lat != null && d.lng != null, text: d.lat != null ? "Ubicación en el mapa" : "Sin coordenadas" },
    { ok: diff == null || Math.abs(diff) <= 35, text: diff == null ? "Sin referencia de precio" : `Precio ${diff >= 0 ? "+" : "−"}${Math.abs(diff)} % vs. zona` },
    { ok: d.advertiser.verified, text: d.advertiser.verified ? "Anunciante verificado" : "Anunciante sin verificar" },
  ];

  const facts: [string, string | null][] = [
    ["Área", d.area ? formatArea(d.area) : null], ["Habitaciones", d.bedrooms != null ? String(d.bedrooms) : null], ["Baños", d.bathrooms != null ? String(d.bathrooms) : null],
    ["Parqueaderos", d.parking != null ? String(d.parking) : null], ["Estrato", d.stratum != null ? String(d.stratum) : null], ["Estado", d.condition === "NEW" ? "Nuevo" : d.condition === "OFF_PLAN" ? "Sobre planos" : "Usado"],
    ["Piso", d.floor != null ? `${d.floor}${d.totalFloors ? ` de ${d.totalFloors}` : ""}` : null], ["Antigüedad", d.ageYears != null ? `${d.ageYears} años` : null],
    ["Administración", d.adminFee ? formatPrice(d.adminFee) : null], ["Amoblado", d.furnished ? "Sí" : null], ["Mascotas", d.petFriendly ? "Admite" : null],
    ["Disponible desde", d.availableFrom ? formatDate(d.availableFrom) : null], ["Contrato mínimo", d.minContractMonths ? `${d.minContractMonths} meses` : null],
  ];

  const pending = d.status === "PENDING_REVIEW";

  return (
    <article className="grid grid-cols-[minmax(0,1fr)] gap-5" aria-label={`Revisión de ${d.title}`}>
      {/* Galería */}
      <section aria-label="Fotos" className="grid gap-2.5" onKeyDown={(e) => { if (e.key === "ArrowRight") setImg((i) => Math.min(imgs.length - 1, i + 1)); if (e.key === "ArrowLeft") setImg((i) => Math.max(0, i - 1)); }}>
        <div className="group relative aspect-[16/10] max-h-[52dvh] w-full overflow-hidden rounded-[20px] bg-surface-2 sm:aspect-[16/9]">
          <Photo src={cur?.url ?? d.coverUrl} alt={cur?.caption ?? `Foto ${img + 1} de ${d.title}`} seed={d.code} className="absolute inset-0 h-full w-full" priority />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
            <div className="flex flex-wrap gap-1.5"><Badge tone={st.tone} className="shadow-sm">{st.label}</Badge>{d.featured && <Badge tone="warn" className="shadow-sm"><Sparkles className="h-3 w-3" />Destacado</Badge>}</div>
            {imgs.length > 0 && <span className="rounded-full bg-ink/70 px-3 py-1 text-xs font-semibold text-white tabular">{Math.min(img, imgs.length - 1) + 1} / {imgs.length}</span>}
          </div>
          {cur?.roomLabel && <span className="absolute bottom-3.5 left-3.5 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold shadow">{cur.roomLabel}</span>}
          {imgs.length > 1 && (
            <>
              <button type="button" onClick={() => setImg((i) => Math.max(0, i - 1))} disabled={img === 0} aria-label="Foto anterior" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/92 shadow-[var(--shadow-card)] transition hover:bg-white disabled:opacity-0"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => setImg((i) => Math.min(imgs.length - 1, i + 1))} disabled={img >= imgs.length - 1} aria-label="Foto siguiente" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/92 shadow-[var(--shadow-card)] transition hover:bg-white disabled:opacity-0"><ChevronRight className="h-5 w-5" /></button>
            </>
          )}
        </div>
        {imgs.length > 1 && (
          <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Miniaturas">
            {imgs.map((im, i) => (
              <li key={im.id} className="shrink-0">
                <button type="button" onClick={() => setImg(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === img} className={cn("relative block h-16 w-24 overflow-hidden rounded-xl border-2 transition", i === img ? "border-brand-600" : "border-transparent opacity-80 hover:opacity-100")}>
                  <Photo src={im.url} alt="" seed={i} className="h-full w-full" widths={[200]} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Título y precio */}
      <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <Badge tone="dark" className="!bg-surface-2 !text-ink-2">{OPERATION_LABEL[d.operation]}</Badge><span>{d.type.name}</span><span>· Cód. {d.code}</span>
          {row && <span className={cn("font-semibold", ageTone(row.updatedAt))}>· En cola {timeAgo(row.updatedAt)}</span>}
          {!pending && <span className="font-semibold text-sun-ink">· Fuera de la cola ({st.label})</span>}
        </div>
        <h2 className="display-md">{d.title}</h2>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="font-display text-[2.4rem] leading-none tabular">{formatPrice(d.price, d.currency)}{d.operation === "RENT" && <span className="ml-1 font-sans text-base text-ink-3">/ mes</span>}</p>
          {d.negotiable && <Badge tone="brand">Negociable</Badge>}
          {ppm && <span className="text-sm text-ink-3 tabular">{formatPrice(Math.round(ppm))} / m²</span>}
          <Link href={d.path} target="_blank" className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">Abrir ficha pública<ExternalLink className="h-4 w-4" /></Link>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Revisión rápida">
          {checks.map((c) => (
            <li key={c.text} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", c.ok ? "bg-success-soft text-success" : "bg-sun-soft text-sun-ink")}>
              {c.ok ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}{c.text}
            </li>
          ))}
        </ul>
      </section>

      {/* Detalles */}
      <section className="card grid gap-5 p-5 md:p-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><dt className="text-xs font-medium text-ink-3">{k}</dt><dd className="mt-0.5 flex items-center gap-1.5 text-[15px] font-semibold">
              {k === "Habitaciones" && <Bed className="h-4 w-4 text-ink-3" />}{k === "Baños" && <Bath className="h-4 w-4 text-ink-3" />}{k === "Parqueaderos" && <Car className="h-4 w-4 text-ink-3" />}{k === "Área" && <Ruler className="h-4 w-4 text-ink-3" />}{v}</dd></div>
          ))}
        </dl>
        <div><h3 className="mb-1.5 text-sm font-semibold">Descripción</h3><p className="max-w-3xl whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{d.description || "Sin descripción."}</p></div>
        {d.amenities.length > 0 && (
          <div><h3 className="mb-2 text-sm font-semibold">Comodidades</h3>
            <ul className="flex flex-wrap gap-2">{d.amenities.map((a) => <li key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-2"><Icon name={a.icon} size={15} className="text-ink-3" />{a.name}</li>)}</ul></div>
        )}
        <div><h3 className="mb-1.5 text-sm font-semibold">Ubicación</h3>
          <p className="flex flex-wrap items-center gap-x-2 text-[15px] text-ink-2"><MapPin className="h-4 w-4 shrink-0 text-ink-3" />{[d.address, d.neighborhood?.name, d.city.name].filter(Boolean).join(", ") || "Sin dirección"}{d.approximateLocation && <Badge tone="neutral">Ubicación aproximada</Badge>}</p>
          {d.lat != null && d.lng != null && <a href={`https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=16/${d.lat}/${d.lng}`} target="_blank" rel="noopener" className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline tabular">{d.lat.toFixed(5)}, {d.lng.toFixed(5)}<ExternalLink className="h-3.5 w-3.5" /></a>}
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <OwnerCard d={d} email={row?.owner.email} />
        <section className="card p-5 md:p-6" aria-labelledby="mkt">
          <h3 id="mkt" className="text-sm font-semibold">Precio vs. mercado</h3>
          {diff == null || !zone ? <p className="mt-3 text-sm text-ink-2">No hay suficientes avisos comparables{!d.area ? " (el aviso no indica área)" : ""} para estimar el precio de mercado.</p> : (
            <>
              <p className={cn("mt-3 font-display text-4xl leading-none tabular", Math.abs(diff) <= 15 ? "text-success" : Math.abs(diff) <= 35 ? "text-sun-ink" : "text-danger")}>{diff > 0 ? "+" : diff < 0 ? "−" : ""}{Math.abs(diff)} %</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">El precio por m² ({formatPriceShort(Math.round(ppm!))}) está {diff === 0 ? "en línea con" : diff > 0 ? "por encima de" : "por debajo de"} el promedio de {zone.name} ({formatPriceShort(zone.z.averagePricePerM2)} / m², {zone.z.total} avisos).</p>
              <div className="relative mt-4 h-2 rounded-full bg-surface-2" aria-hidden><div className="absolute inset-y-0 left-1/2 w-px bg-ink/30" /><div className={cn("absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white shadow", Math.abs(diff) <= 15 ? "bg-success" : Math.abs(diff) <= 35 ? "bg-sun" : "bg-danger")} style={{ left: `${Math.min(96, Math.max(4, 50 + diff / 2))}%` }} /></div>
              <div className="mt-1.5 flex justify-between text-[11px] text-ink-3" aria-hidden><span>−100 %</span><span>Promedio</span><span>+100 %</span></div>
            </>
          )}
        </section>
      </div>

      {/* Barra de acciones */}
      <div className="sticky bottom-3 z-20 flex items-center gap-2 rounded-[22px] border border-line bg-white/95 p-2.5 shadow-[var(--shadow-lift)] backdrop-blur sm:gap-3 sm:p-3" role="toolbar" aria-label="Acciones de moderación">
        <div className="hidden items-center gap-1 sm:flex">
          <Button size="icon-sm" variant="ghost" onClick={onPrev} disabled={!hasPrev} aria-label="Anterior (K)"><ChevronLeft className="h-5 w-5" /></Button>
          <Button size="icon-sm" variant="ghost" onClick={onNext} disabled={!hasNext} aria-label="Siguiente (J)"><ChevronRight className="h-5 w-5" /></Button>
        </div>
        <Button variant="outline" size="md" onClick={onFeature} disabled={busy} aria-label={d.featured ? "Destacado, editar" : "Destacar"} className="shrink-0 !px-3.5 sm:!px-5"><Sparkles className="h-[18px] w-[18px]" /><span className="hidden sm:inline">{d.featured ? "Destacado" : "Destacar"}</span><span className="hidden sm:inline"><Kbd>F</Kbd></span></Button>
        <div className="flex flex-1 items-center gap-2 sm:ml-auto sm:flex-none sm:gap-3">
          <Button variant="outline" size="md" onClick={onReject} disabled={busy || d.status === "REJECTED"} className="flex-1 hover:!border-danger hover:!text-danger sm:flex-none"><X className="h-[18px] w-[18px]" />Rechazar<span className="hidden sm:inline"><Kbd>R</Kbd></span></Button>
          <Button size="md" onClick={(e) => { burst("stamp", e.currentTarget); onApprove(); }} disabled={busy || d.status === "PUBLISHED"} loading={busy} className="flex-1 sm:flex-none"><Check className="h-[18px] w-[18px]" />Aprobar<span className="hidden sm:inline"><Kbd>A</Kbd></span></Button>
        </div>
      </div>
    </article>
  );
}

function OwnerCard({ d, email }: { d: PublicationDetail; email?: string }) {
  const a = d.advertiser;
  const { busy, run } = useAction();
  const [verified, setVerified] = useState(a.verified);
  useEffect(() => setVerified(a.verified), [a.verified]);
  const toggle = () => run(async () => {
    const next = !verified;
    setVerified(next);
    try {
      await api(`/admin/users/${a.id}`, { method: "PATCH", body: { verified: next } });
      toast.success(next ? `${a.name} ahora está verificado` : `Se quitó la verificación de ${a.name}`);
      void globalMutate(`/publications/${d.id}`);
    } catch (e) { setVerified(!next); toast.error(errText(e)); }
  });
  return (
    <section className="card p-5 md:p-6" aria-labelledby="own">
      <h3 id="own" className="text-sm font-semibold">Anunciante</h3>
      <div className="mt-3 flex items-center gap-3.5">
        <Avatar name={a.name} src={a.avatarUrl} size={52} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold">{a.name}{verified && <BadgeCheck className="h-[18px] w-[18px] shrink-0 text-brand-600" aria-label="Verificado" />}</p>
          <p className="truncate text-sm text-ink-3">{email ?? (a.company || "—")}</p>
        </div>
      </div>
      {(d.ownerContact?.phone || d.ownerContact?.whatsapp) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {d.ownerContact.phone && (
            <a href={`tel:${d.ownerContact.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 font-medium text-ink-2 hover:text-brand-700 hover:underline">
              <Phone className="h-4 w-4" />{formatPhoneDisplay(d.ownerContact.phone)}
            </a>
          )}
          {d.ownerContact.whatsapp && (
            <a href={whatsappLink(d.ownerContact.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
              <WhatsAppIcon className="h-4 w-4" size={16} />WhatsApp
            </a>
          )}
        </div>
      )}
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface p-2.5"><dt className="text-[11px] text-ink-3">Rol</dt><dd className="text-sm font-semibold">{{ USER: "Usuario", OWNER: "Propietario", AGENT: "Agente", ADMIN: "Admin" }[a.role]}</dd></div>
        <div className="rounded-xl bg-surface p-2.5"><dt className="text-[11px] text-ink-3">Avisos activos</dt><dd className="text-sm font-semibold tabular">{formatNumber(a.activeListings)}</dd></div>
        <div className="rounded-xl bg-surface p-2.5"><dt className="text-[11px] text-ink-3">Desde</dt><dd className="text-sm font-semibold">{formatDate(a.memberSince, { month: "short", year: "numeric" })}</dd></div>
      </dl>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
        <div><p className="text-sm font-semibold">Anunciante verificado</p><p className="text-xs text-ink-3">Sello de confianza en la ficha. Los avisos igual los aprueba un administrador.</p></div>
        <button type="button" role="switch" aria-checked={verified} aria-label="Marcar anunciante como verificado" onClick={toggle} disabled={busy}
          className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60", verified ? "bg-brand-600" : "bg-line-strong")}>
          <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-300", verified ? "left-[22px]" : "left-0.5")} />
        </button>
      </div>
    </section>
  );
}
