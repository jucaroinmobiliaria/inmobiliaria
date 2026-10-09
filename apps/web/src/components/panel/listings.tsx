"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatNumber, formatPrice, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { OPERATION_LABEL, STATUS_LABEL } from "@/lib/site";
import { toast } from "@/lib/toast";
import type { MyPublicationRow, PublicationStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Badge, EmptyState, Skeleton, Tabs } from "@/components/ui/misc";
import { Photo } from "@/components/ui/photo";
import {
  Copy, Eye, Heart, MapPin, MessageCircle, Pause, Pencil, Play, Plus, RefreshCw, Sparkles, Trash2, Check, ExternalLink, CircleAlert, Building2,
} from "@/components/ui/icon";
import { ActionMenu, CompletionBar, ConfirmDialog, ErrorState, PageHeader, SearchBox, errText, useAction, useData, type MenuItem } from "./common";

type TabKey = "todas" | "publicadas" | "revision" | "borradores" | "pausadas" | "cambios" | "cerradas";
const TAB_STATUSES: Record<TabKey, PublicationStatus[] | null> = {
  todas: null, publicadas: ["PUBLISHED"], revision: ["PENDING_REVIEW"], borradores: ["DRAFT"], pausadas: ["PAUSED"], cambios: ["REJECTED"], cerradas: ["SOLD", "RENTED", "EXPIRED"],
};
const TAB_LABEL: Record<TabKey, string> = { todas: "Todas", publicadas: "Publicadas", revision: "En revisión", borradores: "Borradores", pausadas: "Pausadas", cambios: "Requieren cambios", cerradas: "Cerradas" };
const STATUS_TO_TAB: Record<string, TabKey> = { PUBLISHED: "publicadas", PENDING_REVIEW: "revision", DRAFT: "borradores", PAUSED: "pausadas", REJECTED: "cambios", SOLD: "cerradas", RENTED: "cerradas", EXPIRED: "cerradas" };

type SortKey = "recent" | "views" | "inquiries" | "favorites" | "price_desc" | "price_asc";
const SORTS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Más recientes" }, { value: "views", label: "Más vistas" }, { value: "inquiries", label: "Más contactos" },
  { value: "favorites", label: "Más favoritos" }, { value: "price_desc", label: "Precio: mayor a menor" }, { value: "price_asc", label: "Precio: menor a mayor" },
];

const EMPTY: Record<TabKey, { title: string; text: string }> = {
  todas: { title: "Aún no tienes publicaciones", text: "Publica tu primer inmueble: es gratis y toma unos minutos." },
  publicadas: { title: "No tienes avisos publicados", text: "Cuando un administrador apruebe tu aviso, aparecerá aquí con sus estadísticas." },
  revision: { title: "Nada en revisión", text: "Cuando envíes un borrador, un administrador lo revisa antes de publicarlo y te avisa por aquí." },
  borradores: { title: "No tienes borradores", text: "Los avisos que empieces y no termines se guardan solos en esta pestaña." },
  pausadas: { title: "No tienes avisos pausados", text: "Pausa un aviso cuando no quieras recibir contactos y reanúdalo cuando quieras." },
  cambios: { title: "Todo en orden", text: "Si revisamos un aviso y necesita ajustes, te diremos exactamente qué cambiar aquí." },
  cerradas: { title: "Aún no has cerrado negocios", text: "Aquí quedan tus avisos vendidos, arrendados o vencidos." },
};

type Confirm = { kind: "delete" | "close"; row: MyPublicationRow } | null;

export function Listings() {
  const router = useRouter();
  const sp = useSearchParams();
  const raw = (sp.get("estado") ?? sp.get("status") ?? "todas").toLowerCase();
  const initial: TabKey = (raw in TAB_STATUSES ? raw : STATUS_TO_TAB[raw.toUpperCase()] ?? "todas") as TabKey;
  const [tab, setTabState] = useState<TabKey>(initial);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [confirm, setConfirm] = useState<Confirm>(null);
  const { busy, run } = useAction();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, error, isLoading, isValidating, mutate } = useData<MyPublicationRow[]>("/me/publications");

  const setTab = (t: TabKey) => {
    setTabState(t);
    router.replace(t === "todas" ? "/panel/publicaciones" : `/panel/publicaciones?estado=${t}`, { scroll: false });
  };

  const counts = useMemo(() => {
    const c = Object.fromEntries((Object.keys(TAB_STATUSES) as TabKey[]).map((k) => [k, 0])) as Record<TabKey, number>;
    for (const r of data ?? []) { c.todas++; const t = STATUS_TO_TAB[r.status]; if (t) c[t]++; }
    return c;
  }, [data]);

  const rows = useMemo(() => {
    const st = TAB_STATUSES[tab];
    const term = q.trim().toLowerCase();
    const list = (data ?? []).filter((r) => (!st || st.includes(r.status)) && (!term || [r.title, String(r.code), r.city, r.neighborhood, r.type].some((s) => s?.toLowerCase().includes(term))));
    const by: Record<SortKey, (a: MyPublicationRow, b: MyPublicationRow) => number> = {
      recent: (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
      views: (a, b) => b.views - a.views, inquiries: (a, b) => b.inquiries - a.inquiries, favorites: (a, b) => b.favorites - a.favorites,
      price_desc: (a, b) => b.price - a.price, price_asc: (a, b) => a.price - b.price,
    };
    return [...list].sort(by[sort]);
  }, [data, tab, q, sort]);

  /** Ejecuta una acción con UI optimista; revierte y avisa si falla. */
  const perform = (row: MyPublicationRow, o: { request: () => Promise<unknown>; apply: (rows: MyPublicationRow[]) => MyPublicationRow[]; success: string }) =>
    run(async () => {
      setBusyId(row.id);
      try {
        await mutate(async (cur) => { await o.request(); return o.apply(cur ?? []); }, { optimisticData: (cur) => o.apply(cur ?? []), rollbackOnError: true, populateCache: true, revalidate: true });
        toast.success(o.success);
      } catch (e) {
        toast.error(errText(e));
      } finally { setBusyId(null); }
    });

  const patchRow = (id: string, p: Partial<MyPublicationRow>) => (rows: MyPublicationRow[]) => rows.map((r) => (r.id === id ? { ...r, ...p } : r));

  const doPause = (r: MyPublicationRow) => perform(r, { request: () => api(`/publications/${r.id}/pause`, { method: "POST" }), apply: patchRow(r.id, { status: "PAUSED" }), success: "Aviso pausado. Ya no recibirá contactos." });
  const doResume = (r: MyPublicationRow) => perform(r, { request: () => api(`/publications/${r.id}/resume`, { method: "POST" }), apply: patchRow(r.id, { status: "PUBLISHED" }), success: "Aviso reanudado. Vuelve a estar visible." });
  const doRenew = (r: MyPublicationRow) => perform(r, { request: () => api(`/publications/${r.id}/renew`, { method: "POST" }), apply: (x) => x, success: "Renovado por 60 días más." });
  const doDuplicate = (r: MyPublicationRow) => perform(r, { request: () => api(`/publications/${r.id}/duplicate`, { method: "POST" }), apply: (x) => x, success: "Copia creada en Borradores." });
  const doClose = (r: MyPublicationRow) => perform(r, { request: () => api(`/publications/${r.id}/mark-closed`, { method: "POST" }), apply: patchRow(r.id, { status: r.operation === "SALE" ? "SOLD" : "RENTED" }), success: r.operation === "SALE" ? "¡Felicitaciones! Marcado como vendido." : "¡Felicitaciones! Marcado como arrendado." });
  const doDelete = (r: MyPublicationRow) => {
    const hard = r.status === "DRAFT" || r.status === "REJECTED";
    return perform(r, { request: () => api(`/publications/${r.id}`, { method: "DELETE" }), apply: hard ? (x) => x.filter((y) => y.id !== r.id) : patchRow(r.id, { status: "EXPIRED" }), success: hard ? "Borrador eliminado." : "Aviso retirado. Lo encuentras en Cerradas." });
  };

  const menuFor = (r: MyPublicationRow): MenuItem[] => {
    const live = r.status === "PUBLISHED", paused = r.status === "PAUSED";
    const closed = r.status === "SOLD" || r.status === "RENTED";
    return [
      { label: "Ver publicación", icon: <ExternalLink />, href: r.path ?? undefined, hidden: !r.path || !(live || paused) },
      { label: "Editar", icon: <Pencil />, href: `/publicar/${r.id}`, hidden: closed },
      { label: "Pausar", icon: <Pause />, onSelect: () => void doPause(r), hidden: !live },
      { label: "Reanudar", icon: <Play />, onSelect: () => void doResume(r), hidden: !paused },
      { label: r.operation === "SALE" ? "Marcar como vendido" : "Marcar como arrendado", icon: <Check />, onSelect: () => setConfirm({ kind: "close", row: r }), hidden: !(live || paused) },
      { label: "Duplicar", icon: <Copy />, onSelect: () => void doDuplicate(r) },
      { label: "Renovar 60 días", icon: <RefreshCw />, onSelect: () => void doRenew(r), hidden: !(live || paused || r.status === "EXPIRED") },
      { label: r.status === "DRAFT" || r.status === "REJECTED" ? "Eliminar" : "Retirar aviso", icon: <Trash2 />, tone: "danger", separatorBefore: true, onSelect: () => setConfirm({ kind: "delete", row: r }), hidden: r.status === "EXPIRED" || closed },
    ];
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader eyebrow="Mi panel" title="Publicaciones" description="Nada se publica solo: un administrador aprueba cada aviso. Desde aquí editas, pausas y miras cómo les va."
        actions={<Button href="/publicar" className="lg:hidden"><Plus className="h-[18px] w-[18px]" />Publicar inmueble</Button>} />

      {counts.revision > 0 && (
        <p className="rounded-[20px] border border-line bg-brand-50 px-5 py-3.5 text-sm leading-relaxed text-brand-800">
          <span className="font-semibold">{counts.revision === 1 ? "1 aviso espera aprobación." : `${counts.revision} avisos esperan aprobación.`}</span> Siguen ocultos en la búsqueda pública hasta que un administrador los acepte.
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <Tabs value={tab} onChange={setTab} items={(Object.keys(TAB_LABEL) as TabKey[]).map((k) => ({ value: k, label: TAB_LABEL[k], count: data ? counts[k] : undefined }))} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_230px]">
          <SearchBox value={q} onChange={setQ} placeholder="Buscar por título, código o ciudad" label="Buscar publicaciones" />
          <Select aria-label="Ordenar por" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-11">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
      </div>

      <div aria-live="polite" className={cn("grid gap-4 transition-opacity", isValidating && data && "opacity-80")}>
        {error && !data ? <ErrorState error={error} onRetry={() => void mutate()} />
          : isLoading && !data ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
          : rows.length === 0 ? (
            q.trim() ? (
              <EmptyState icon={<Building2 className="h-6 w-6" />} title="Sin resultados" text={`No encontramos avisos que coincidan con «${q.trim()}» en esta pestaña.`} action={<Button variant="outline" onClick={() => setQ("")}>Limpiar búsqueda</Button>} />
            ) : (
              <EmptyState icon={<Building2 className="h-6 w-6" />} title={EMPTY[tab].title} text={EMPTY[tab].text}
                action={tab === "todas" || tab === "borradores" ? <Button href="/publicar"><Plus className="h-[18px] w-[18px]" />Publicar inmueble</Button> : counts.todas > 0 ? <Button variant="outline" onClick={() => setTab("todas")}>Ver todas</Button> : undefined} />
            )
          ) : rows.map((r, i) => <Row key={r.id} r={r} idx={i} menu={menuFor(r)} loading={busyId === r.id} disabled={busy} />)}
      </div>

      <ConfirmDialog
        open={confirm?.kind === "close"} onClose={() => setConfirm(null)} tone="primary"
        title={confirm?.row.operation === "SALE" ? "¿Marcar como vendido?" : "¿Marcar como arrendado?"}
        description={<>«{confirm?.row.title}» dejará de mostrarse en las búsquedas. Podrás consultarlo en la pestaña Cerradas.</>}
        confirmLabel={confirm?.row.operation === "SALE" ? "Sí, vendido" : "Sí, arrendado"} loading={busy}
        onConfirm={async () => { const r = confirm!.row; await doClose(r); setConfirm(null); }}
      />
      <ConfirmDialog
        open={confirm?.kind === "delete"} onClose={() => setConfirm(null)}
        title={confirm && (confirm.row.status === "DRAFT" || confirm.row.status === "REJECTED") ? "¿Eliminar este borrador?" : "¿Retirar este aviso?"}
        description={confirm && (confirm.row.status === "DRAFT" || confirm.row.status === "REJECTED")
          ? <>Se eliminará «{confirm.row.title}» con sus fotos. Esta acción no se puede deshacer.</>
          : <>«{confirm?.row.title}» dejará de estar visible y pasará a Cerradas como vencido. Podrás renovarlo después.</>}
        confirmLabel={confirm && (confirm.row.status === "DRAFT" || confirm.row.status === "REJECTED") ? "Eliminar" : "Retirar"} loading={busy}
        onConfirm={async () => { const r = confirm!.row; await doDelete(r); setConfirm(null); }}
      />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="card flex flex-col gap-4 p-3 sm:flex-row" aria-hidden>
      <Skeleton className="aspect-[4/3] w-full rounded-2xl sm:h-[150px] sm:w-[210px]" />
      <div className="grid flex-1 content-start gap-3 py-1"><Skeleton className="h-5 w-24" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-40" /></div>
    </div>
  );
}

function Row({ r, idx, menu, loading, disabled }: { r: MyPublicationRow; idx: number; menu: MenuItem[]; loading: boolean; disabled: boolean }) {
  const st = STATUS_LABEL[r.status] ?? { label: r.status, tone: "neutral" as const };
  const place = [r.neighborhood, r.city].filter(Boolean).join(", ");
  const isDraft = r.status === "DRAFT";
  const live = r.status === "PUBLISHED" || r.status === "PAUSED";
  const primary = r.status === "REJECTED" ? { label: "Corregir y reenviar", href: `/publicar/${r.id}`, icon: <Pencil className="h-4 w-4" />, variant: "primary" as const }
    : isDraft ? { label: "Continuar", href: `/publicar/${r.id}`, icon: <Pencil className="h-4 w-4" />, variant: "primary" as const }
    : live && r.path ? { label: "Ver", href: r.path, icon: <Eye className="h-4 w-4" />, variant: "outline" as const }
    : r.status !== "SOLD" && r.status !== "RENTED" ? { label: "Editar", href: `/publicar/${r.id}`, icon: <Pencil className="h-4 w-4" />, variant: "outline" as const } : null;

  return (
    <article className={cn("card relative flex flex-col gap-4 p-3 transition-shadow hover:shadow-[var(--shadow-card)] sm:flex-row sm:gap-5", loading && "pointer-events-none opacity-70")} aria-busy={loading}>
      <Link href={r.path && live ? r.path : `/publicar/${r.id}`} className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden rounded-2xl sm:aspect-auto sm:h-[158px] sm:w-[220px]" tabIndex={-1} aria-hidden>
        <Photo src={r.coverUrl} alt="" seed={idx + r.code} className="absolute inset-0 h-full w-full" />
        {r.featured && <span className="absolute left-2.5 top-2.5"><Badge tone="warn" className="shadow-sm"><Sparkles className="h-3 w-3" />Destacado</Badge></span>}
        {r.status === "PAUSED" && <div className="absolute inset-0 grid place-items-center bg-ink/35"><Pause className="h-8 w-8 text-white" /></div>}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col py-0.5 sm:pr-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={st.tone}>{(r.status === "SOLD" || r.status === "RENTED") ? st.label : st.label}</Badge>
          <Badge tone="dark" className="!bg-surface-2 !text-ink-2">{OPERATION_LABEL[r.operation]}</Badge>
          <span className="text-xs text-ink-3">Cód. {r.code} · Actualizado {timeAgo(r.updatedAt)}</span>
        </div>
        <h3 className="mt-2 line-clamp-1 text-[17px] font-semibold leading-snug">{r.title || "Borrador sin título"}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2"><MapPin className="h-4 w-4 shrink-0 text-ink-3" /><span className="truncate">{place || "Ubicación pendiente"}{r.type ? ` · ${r.type}` : ""}</span></p>
        <p className="mt-2 font-display text-[1.65rem] leading-none tabular">
          {r.price > 0 ? formatPrice(r.price, r.currency) : <span className="font-sans text-base text-ink-3">Precio por definir</span>}
          {r.price > 0 && r.operation === "RENT" && <span className="ml-1 font-sans text-sm text-ink-3">/ mes</span>}
        </p>

        {isDraft ? (
          <div className="mt-3 max-w-sm"><p className="mb-1 text-xs font-medium text-ink-3">Avance del borrador</p><CompletionBar value={r.completion} /></div>
        ) : (
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-2">
            <MiniStat icon={<Eye className="h-4 w-4" />} label="Vistas" value={r.views} />
            <MiniStat icon={<Heart className="h-4 w-4" />} label="Favoritos" value={r.favorites} />
            <MiniStat icon={<MessageCircle className="h-4 w-4" />} label="Contactos" value={r.inquiries} />
          </dl>
        )}

        {r.status === "REJECTED" && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-danger-soft px-3.5 py-3 text-sm text-danger" role="note">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p><strong className="font-semibold">Qué debes corregir: </strong><span className="text-ink">{r.moderationNote || "Revisa la información y las fotos de tu aviso y vuelve a enviarlo."}</span></p>
          </div>
        )}
        {r.status === "PENDING_REVIEW" && <p className="mt-3 text-[13px] text-ink-3">Nuestro equipo lo está revisando. Normalmente toma menos de 24 horas.</p>}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-3 sm:flex-col sm:items-end sm:justify-between sm:border-t-0 sm:pt-0.5">
        <ActionMenu items={menu} label={`Acciones de ${r.title || "borrador"}`} className={disabled ? "pointer-events-none opacity-50" : ""} />
        {primary && <Button href={primary.href} variant={primary.variant} size="sm">{primary.icon}{primary.label}</Button>}
      </div>
    </article>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5"><dt className="sr-only">{label}</dt><span className="text-ink-3" aria-hidden>{icon}</span><dd className="font-semibold text-ink tabular">{formatNumber(value)}</dd><span className="text-ink-3" aria-hidden>{label.toLowerCase()}</span></div>
  );
}
