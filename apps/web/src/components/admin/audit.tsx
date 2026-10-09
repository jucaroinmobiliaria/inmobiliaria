"use client";

import { useState } from "react";
import { qs } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, timeAgo } from "@/lib/format";
import type { AuditRow, Paginated } from "@/lib/types";
import { Badge } from "@/components/ui/misc";
import { ChevronDown } from "@/components/ui/icon";
import { ErrorState, PageHeader, SearchBox, useData } from "@/components/panel/common";
import { DataTable, FilterBar, type Column } from "./ui";

const ENTITY: Record<string, string> = { user: "Usuario", publication: "Publicación", report: "Reporte", types: "Tipo de inmueble", amenities: "Comodidad", cities: "Ciudad", neighborhoods: "Barrio" };
const PAGE_SIZE = 25;

type Tone = "success" | "danger" | "info" | "warn" | "neutral" | "brand";
function toneOf(action: string): Tone {
  const a = action.toLowerCase();
  if (/reject|delete|remove|block|dismiss|ban|revoke/.test(a) && !/unblock/.test(a)) return "danger";
  if (/approve|verify|resolve|unblock|publish|resume/.test(a)) return "success";
  if (/create|add|register|login/.test(a)) return "info";
  if (/feature|role|pause|update|patch|edit/.test(a)) return "warn";
  return "neutral";
}

export function AdminAudit() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const { data, error, isLoading, isValidating, mutate } = useData<Paginated<AuditRow>>(`/admin/audit${qs({ page, pageSize: PAGE_SIZE })}`);

  const term = filter.trim().toLowerCase();
  const rows = data?.items.filter((r) => !term || [r.action, r.entity, r.entityId, r.actor].some((s) => s?.toLowerCase().includes(term)));
  const hasMeta = (r: AuditRow) => r.meta != null && !(typeof r.meta === "object" && Object.keys(r.meta as object).length === 0);

  const toggle = (r: AuditRow) => (
    <button type="button" aria-expanded={open === r.id} aria-controls={`meta-${r.id}`} onClick={() => setOpen(open === r.id ? null : r.id)} className="inline-flex h-8 items-center gap-1 rounded-full border border-line-strong px-3 text-xs font-semibold text-ink-2 hover:border-ink">
      JSON<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open === r.id && "rotate-180")} />
    </button>
  );
  const metaPre = (r: AuditRow) => (
    <pre id={`meta-${r.id}`} className="max-h-72 overflow-auto rounded-xl bg-ink p-4 font-mono text-xs leading-relaxed text-brand-100">{JSON.stringify(r.meta, null, 2)}</pre>
  );

  const columns: Column<AuditRow>[] = [
    { key: "when", header: "Cuándo", cell: (r) => <time dateTime={r.createdAt} title={formatDate(r.createdAt, { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })} className="whitespace-nowrap"><span className="font-medium">{timeAgo(r.createdAt)}</span><span className="block text-xs text-ink-3">{formatDate(r.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span></time> },
    { key: "action", header: "Acción", cell: (r) => <Badge tone={toneOf(r.action)} className="font-mono !text-[11.5px] !font-semibold">{r.action}</Badge> },
    { key: "actor", header: "Actor", cell: (r) => <span className="font-medium">{r.actor ?? <span className="text-ink-3">Sistema</span>}</span> },
    { key: "entity", header: "Entidad", from: "md", cell: (r) => <span><span className="font-medium">{ENTITY[r.entity.toLowerCase()] ?? r.entity}</span>{r.entityId && <span className="ml-1.5 font-mono text-xs text-ink-3" title={r.entityId}>{r.entityId.length > 12 ? `${r.entityId.slice(0, 8)}…` : r.entityId}</span>}</span> },
    { key: "meta", header: "Detalle", align: "right", cell: (r) => hasMeta(r) ? toggle(r) : <span className="text-ink-3">—</span> },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader eyebrow="Administración" title="Auditoría" description="Registro de las acciones de moderación y administración. Útil para revisar quién hizo qué y cuándo." />
      <FilterBar>
        <SearchBox className="w-full sm:w-80" value={filter} onChange={setFilter} placeholder="Filtrar esta página por acción o actor" label="Filtrar el registro" />
        {data && <p className="text-sm text-ink-3 sm:ml-auto"><strong className="text-ink tabular">{data.total.toLocaleString("es-CO")}</strong> eventos</p>}
      </FilterBar>
      {error && !data ? <ErrorState error={error} onRetry={() => void mutate()} /> : (
        <DataTable<AuditRow> caption="Registro de auditoría" columns={columns} rows={rows} rowKey={(r) => r.id} loading={isLoading} fetching={isValidating}
          emptyTitle="Sin eventos" emptyText={term ? "Ningún evento de esta página coincide con el filtro." : "Aún no se registran acciones."}
          pagination={data ? { page: data.page, totalPages: data.totalPages, total: data.total, pageSize: data.pageSize, onPage: (p) => { setOpen(null); setPage(p); } } : undefined}
          expandedRow={(r) => (open === r.id && hasMeta(r) ? metaPre(r) : null)}
          mobileCard={(r) => (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={toneOf(r.action)} className="font-mono !text-[11.5px] !font-semibold">{r.action}</Badge>
                <time dateTime={r.createdAt} className="shrink-0 text-xs text-ink-3">{timeAgo(r.createdAt)}</time>
              </div>
              <p className="text-sm"><span className="font-medium">{r.actor ?? "Sistema"}</span></p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-sm text-ink-2">{ENTITY[r.entity.toLowerCase()] ?? r.entity}{r.entityId && <span className="ml-1.5 font-mono text-xs text-ink-3">{r.entityId.length > 12 ? `${r.entityId.slice(0, 8)}…` : r.entityId}</span>}</p>
                {hasMeta(r) && toggle(r)}
              </div>
              {open === r.id && hasMeta(r) && metaPre(r)}
            </div>
          )} />
      )}
    </div>
  );
}
