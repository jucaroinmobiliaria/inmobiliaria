"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { mutate as globalMutate } from "swr";
import { api, qs } from "@/lib/api";
import { formatNumber, formatPrice, timeAgo } from "@/lib/format";
import { OPERATION_LABEL, STATUS_LABEL } from "@/lib/site";
import { toast } from "@/lib/toast";
import type { AdminPublicationRow, Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/misc";
import { Photo } from "@/components/ui/photo";
import { BadgeCheck, Check, ExternalLink, Eye, Flag, ListChecks, Pause, Play, Sparkles, X } from "@/components/ui/icon";
import { ActionMenu, ConfirmDialog, ErrorState, PageHeader, SearchBox, errText, useAction, useData, useDebounced, type MenuItem } from "@/components/panel/common";
import { FeatureDialog, RejectDialog } from "./dialogs";
import { DataTable, FilterBar, FilterSelect, type Column } from "./ui";

const PAGE_SIZE = 20;
const STATUSES = ["PENDING_REVIEW", "PUBLISHED", "PAUSED", "REJECTED", "DRAFT", "SOLD", "RENTED", "EXPIRED"] as const;

type Dialog = { kind: "reject" | "feature" | "pause"; row: AdminPublicationRow } | null;

export function AdminPublications() {
  const sp = useSearchParams();
  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q, 350);
  const [dialog, setDialog] = useState<Dialog>(null);
  const { busy, run } = useAction();

  const paramQ = sp.get("q"), paramStatus = sp.get("status");
  useEffect(() => { setQ(paramQ ?? ""); setStatus(paramStatus ?? ""); setPage(1); }, [paramQ, paramStatus]);
  useEffect(() => setPage(1), [dq, status]);

  const key = `/admin/publications${qs({ status, q: dq.trim(), page, pageSize: PAGE_SIZE })}`;
  const { data, error, isLoading, isValidating, mutate } = useData<Paginated<AdminPublicationRow>>(key);

  const patch = (id: string, p: Partial<AdminPublicationRow>) => (cur?: Paginated<AdminPublicationRow>) => (cur ? { ...cur, items: cur.items.map((r) => (r.id === id ? { ...r, ...p } : r)) } : cur);

  const act = (row: AdminPublicationRow, request: () => Promise<unknown>, p: Partial<AdminPublicationRow>, success: string) => run(async () => {
    try {
      await mutate(async (cur) => { await request(); return patch(row.id, p)(cur); }, { optimisticData: (cur) => patch(row.id, p)(cur) as Paginated<AdminPublicationRow>, rollbackOnError: true, populateCache: true, revalidate: true });
      toast.success(success);
      void globalMutate("/admin/overview");
      setDialog(null);
    } catch (e) { toast.error(errText(e)); }
  });

  const approve = (r: AdminPublicationRow) => act(r, () => api(`/admin/publications/${r.id}/approve`, { method: "POST" }), { status: "PUBLISHED" }, `Aprobada: «${r.title}»`);
  const reject = (r: AdminPublicationRow, reason: string) => act(r, () => api(`/admin/publications/${r.id}/reject`, { method: "POST", body: { reason } }), { status: "REJECTED", moderationNote: reason }, `Rechazada: «${r.title}»`);
  const feature = (r: AdminPublicationRow, v: { featured: boolean; days?: number }) => act(r, () => api(`/admin/publications/${r.id}/feature`, { method: "PATCH", body: v }), { featured: v.featured }, v.featured ? `Destacada por ${v.days} días` : "Ya no está destacada");
  const pause = (r: AdminPublicationRow) => act(r, () => api(`/publications/${r.id}/pause`, { method: "POST" }), { status: "PAUSED" }, "Publicación pausada");
  const resume = (r: AdminPublicationRow) => act(r, () => api(`/publications/${r.id}/resume`, { method: "POST" }), { status: "PUBLISHED" }, "Publicación reanudada");

  const menu = (r: AdminPublicationRow): MenuItem[] => [
    { label: "Ver ficha pública", icon: <ExternalLink />, href: r.path ?? undefined, external: true, hidden: !r.path },
    { label: "Abrir en moderación", icon: <ListChecks />, href: `/admin/moderacion?id=${r.id}` },
    { label: "Aprobar", icon: <Check />, onSelect: () => void approve(r), hidden: r.status !== "PENDING_REVIEW", separatorBefore: true },
    { label: "Rechazar…", icon: <X />, tone: "danger", onSelect: () => setDialog({ kind: "reject", row: r }), hidden: r.status !== "PENDING_REVIEW" },
    { label: r.featured ? "Gestionar destacado…" : "Destacar…", icon: <Sparkles />, onSelect: () => setDialog({ kind: "feature", row: r }), hidden: r.status !== "PUBLISHED", separatorBefore: r.status === "PUBLISHED" },
    { label: "Pausar…", icon: <Pause />, onSelect: () => setDialog({ kind: "pause", row: r }), hidden: r.status !== "PUBLISHED" },
    { label: "Reanudar", icon: <Play />, onSelect: () => void resume(r), hidden: r.status !== "PAUSED" },
  ];

  const columns: Column<AdminPublicationRow>[] = [
    { key: "title", header: "Aviso", className: "w-[34%]", cell: (r) => (
      <div className="flex min-w-[260px] items-center gap-3">
        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg"><Photo src={r.coverUrl} alt="" seed={r.code} className="h-full w-full" widths={[200]} /></div>
        <div className="min-w-0">
          <Link href={`/admin/moderacion?id=${r.id}`} className="line-clamp-1 font-semibold hover:text-brand-700 hover:underline">{r.title || "Sin título"}</Link>
          <p className="text-xs text-ink-3">Cód. {r.code} · {OPERATION_LABEL[r.operation]}{r.city ? ` · ${r.city}` : ""}</p>
        </div>
      </div>
    ) },
    { key: "owner", header: "Anunciante", from: "md", cell: (r) => (
      <div className="min-w-[150px]"><p className="flex items-center gap-1 font-medium">{r.owner.name}{r.owner.verified && <BadgeCheck className="h-4 w-4 text-brand-600" aria-label="Verificado" />}</p><p className="max-w-[200px] truncate text-xs text-ink-3">{r.owner.email}</p></div>
    ) },
    { key: "status", header: "Estado", cell: (r) => <div className="flex flex-wrap items-center gap-1.5"><StatusCell r={r} />{r.reportCount > 0 && <span title={`${r.reportCount} reportes abiertos`}><Badge tone="danger"><Flag className="h-3 w-3" />{r.reportCount}</Badge></span>}</div> },
    { key: "price", header: "Precio", from: "xl", align: "right", cell: (r) => <span className="whitespace-nowrap font-medium tabular">{r.price > 0 ? formatPrice(r.price, r.currency) : "—"}</span> },
    { key: "views", header: "Vistas", from: "2xl", align: "right", cell: (r) => <span className="inline-flex items-center gap-1 tabular text-ink-2"><Eye className="h-3.5 w-3.5 text-ink-3" />{formatNumber(r.views)}</span> },
    { key: "updated", header: "Actualizado", from: "2xl", cell: (r) => <span className="whitespace-nowrap text-ink-2">{timeAgo(r.updatedAt)}</span> },
    { key: "actions", header: "Acciones", srHeader: true, align: "right", cell: (r) => <ActionMenu items={menu(r)} label={`Acciones para ${r.title}`} /> },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader eyebrow="Administración" title="Publicaciones" description="Todas las publicaciones de la plataforma. Filtra por estado, busca por título, código o anunciante." />
      <FilterBar>
        <SearchBox className="w-full sm:w-80" value={q} onChange={setQ} placeholder="Título, código o anunciante" label="Buscar publicaciones" />
        <FilterSelect label="Filtrar por estado" value={status} onChange={setStatus} className="w-full sm:w-52">
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]!.label}</option>)}
        </FilterSelect>
        {data && <p className="text-sm text-ink-3 sm:ml-auto"><strong className="text-ink tabular">{formatNumber(data.total)}</strong> {data.total === 1 ? "resultado" : "resultados"}</p>}
      </FilterBar>

      {error && !data ? <ErrorState error={error} onRetry={() => void mutate()} /> : (
        <DataTable<AdminPublicationRow> caption="Publicaciones de la plataforma" columns={columns} rows={data?.items} rowKey={(r) => r.id} loading={isLoading} fetching={isValidating}
          emptyTitle="No hay publicaciones con estos filtros" emptyText="Prueba con otro estado o quita la búsqueda."
          pagination={data ? { page: data.page, totalPages: data.totalPages, total: data.total, pageSize: data.pageSize, onPage: setPage } : undefined}
          mobileCard={(r) => (
            <div className="flex gap-3">
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl"><Photo src={r.coverUrl} alt="" seed={r.code} className="h-full w-full" widths={[200]} /></div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/moderacion?id=${r.id}`} className="line-clamp-1 text-sm font-semibold">{r.title || "Sin título"}</Link>
                <p className="truncate text-xs text-ink-3">{r.owner.name} · Cód. {r.code}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2"><StatusCell r={r} />{r.reportCount > 0 && <Badge tone="danger"><Flag className="h-3 w-3" />{r.reportCount}</Badge>}<span className="text-xs font-medium tabular">{formatPrice(r.price, r.currency)}</span></div>
              </div>
              <ActionMenu items={menu(r)} label={`Acciones para ${r.title}`} />
            </div>
          )} />
      )}

      <RejectDialog open={dialog?.kind === "reject"} title={dialog?.row.title ?? ""} onClose={() => setDialog(null)} loading={busy} onSubmit={(reason) => void reject(dialog!.row, reason)} />
      <FeatureDialog open={dialog?.kind === "feature"} title={dialog?.row.title ?? ""} featured={!!dialog?.row.featured} onClose={() => setDialog(null)} loading={busy} onSubmit={(v) => void feature(dialog!.row, v)} />
      <ConfirmDialog open={dialog?.kind === "pause"} tone="primary" title="¿Pausar esta publicación?" confirmLabel="Pausar" loading={busy} onClose={() => setDialog(null)} onConfirm={() => void pause(dialog!.row)}
        description={<>«{dialog?.row.title}» dejará de mostrarse en el sitio hasta que se reanude.</>} />
    </div>
  );
}

function StatusCell({ r }: { r: AdminPublicationRow }) {
  const st = STATUS_LABEL[r.status] ?? { label: r.status, tone: "neutral" as const };
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Badge tone={st.tone}>{st.label}</Badge>{r.featured && <span title="Destacada" className="text-sun"><Sparkles className="h-4 w-4" aria-label="Destacada" /></span>}</span>;
}
