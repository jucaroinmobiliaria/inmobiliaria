"use client";

import Link from "next/link";
import { useState } from "react";
import { mutate as globalMutate } from "swr";
import { api, qs } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/site";
import { toast } from "@/lib/toast";
import type { AdminReportRow, ReportStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Skeleton } from "@/components/ui/misc";
import { Check, CircleCheck, ExternalLink, Flag, ListChecks, RefreshCw, User, X } from "@/components/ui/icon";
import { ErrorState, PageHeader, Segmented, errText, useAction, useData } from "@/components/panel/common";
import { useAdminCounts } from "./admin-shell";

const REASONS: Record<string, string> = {
  spam: "Spam o publicidad", fraud: "Posible fraude", scam: "Posible estafa", duplicate: "Aviso duplicado", wrong_info: "Información incorrecta", inappropriate: "Contenido inapropiado",
  unavailable: "Inmueble no disponible", wrong_price: "Precio engañoso", other: "Otro motivo",
};
const reasonLabel = (r: string) => REASONS[r.toLowerCase()] ?? (r.charAt(0).toUpperCase() + r.slice(1).replace(/_/g, " "));

export function AdminReports() {
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const { reports: openCount } = useAdminCounts();
  const key = `/admin/reports${qs({ status })}`;
  const { data, error, isLoading, isValidating, mutate } = useData<AdminReportRow[]>(key, { refreshInterval: 60_000 });
  const { busy, run } = useAction();
  const [busyId, setBusyId] = useState<string | null>(null);

  const setReport = (r: AdminReportRow, next: ReportStatus, msg: string) => run(async () => {
    setBusyId(r.id);
    const drop = (cur?: AdminReportRow[]) => (cur ?? []).filter((x) => x.id !== r.id);
    try {
      await mutate(async (cur) => { await api(`/admin/reports/${r.id}`, { method: "PATCH", body: { status: next } }); return drop(cur); }, { optimisticData: (cur) => drop(cur), rollbackOnError: true, populateCache: true, revalidate: true });
      toast.success(msg);
      void globalMutate("/admin/overview");
    } catch (e) { toast.error(errText(e)); } finally { setBusyId(null); }
  });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader eyebrow="Administración" title="Reportes" description="Avisos denunciados por la comunidad. Revisa el contexto y decide: resolver si hiciste algo, descartar si no procede." />
      <Segmented<ReportStatus> label="Estado de los reportes" value={status} onChange={setStatus}
        items={[{ value: "OPEN", label: "Abiertos", count: status === "OPEN" && data ? data.length : openCount || undefined }, { value: "RESOLVED", label: "Resueltos" }, { value: "DISMISSED", label: "Descartados" }]} />

      <div aria-live="polite" className={isValidating && data ? "opacity-80 transition-opacity" : undefined}>
        {error && !data ? <ErrorState error={error} onRetry={() => void mutate()} />
          : isLoading && !data ? <div className="grid grid-cols-[minmax(0,1fr)] gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-[20px]" />)}</div>
          : !data?.length ? (
            <EmptyState icon={status === "OPEN" ? <CircleCheck className="h-7 w-7" /> : <Flag className="h-6 w-6" />}
              title={status === "OPEN" ? "No hay reportes abiertos" : status === "RESOLVED" ? "Aún no hay reportes resueltos" : "Aún no hay reportes descartados"}
              text={status === "OPEN" ? "La comunidad no ha denunciado nada pendiente. ¡Buen trabajo!" : "Aquí quedará el historial de las decisiones que tomes."} />
          ) : (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-4">
              {data.map((r) => {
                const st = STATUS_LABEL[r.publication.status] ?? { label: r.publication.status, tone: "neutral" as const };
                return (
                  <li key={r.id} className="card grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:p-6" aria-busy={busyId === r.id}>
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="danger"><Flag className="h-3 w-3" />{reasonLabel(r.reason)}</Badge>
                        <span className="text-xs text-ink-3">{timeAgo(r.createdAt)} · {formatDate(r.createdAt)}</span>
                        {r.status !== "OPEN" && <Badge tone={r.status === "RESOLVED" ? "success" : "neutral"}>{r.status === "RESOLVED" ? "Resuelto" : "Descartado"}</Badge>}
                      </div>
                      {r.details ? <blockquote className="border-l-2 border-line-strong pl-4 text-[15px] leading-relaxed text-ink-2">{r.details}</blockquote> : <p className="text-sm italic text-ink-3">Sin detalles adicionales.</p>}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-ink-2"><User className="h-4 w-4 text-ink-3" />{r.reporter ? <>Reportado por <strong className="font-semibold text-ink">{r.reporter.name}</strong></> : "Reporte anónimo"}</span>
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {r.publication.path ? <Link href={r.publication.path} target="_blank" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">{r.publication.title}<ExternalLink className="h-3.5 w-3.5" /></Link> : <span className="font-semibold">{r.publication.title}</span>}
                          <span className="text-xs text-ink-3">Cód. {r.publication.code}</span><Badge tone={st.tone}>{st.label}</Badge>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:w-44 md:flex-col">
                      <Button size="sm" variant="outline" href={`/admin/moderacion?id=${r.publication.id}`} className="md:w-full"><ListChecks className="h-4 w-4" />Moderar aviso</Button>
                      {r.status === "OPEN" ? (
                        <>
                          <Button size="sm" onClick={() => void setReport(r, "RESOLVED", "Reporte resuelto")} disabled={busy} loading={busyId === r.id} className="md:w-full"><Check className="h-4 w-4" />Resolver</Button>
                          <Button size="sm" variant="outline" onClick={() => void setReport(r, "DISMISSED", "Reporte descartado")} disabled={busy} className="md:w-full"><X className="h-4 w-4" />Descartar</Button>
                        </>
                      ) : <Button size="sm" variant="ghost" onClick={() => void setReport(r, "OPEN", "Reporte reabierto")} disabled={busy} className="md:w-full"><RefreshCw className="h-4 w-4" />Reabrir</Button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
    </div>
  );
}
