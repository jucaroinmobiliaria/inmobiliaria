"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, whatsappLink } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { VisitRow, VisitStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Skeleton } from "@/components/ui/misc";
import { Photo } from "@/components/ui/photo";
import { Ban, Calendar, Check, Clock, ExternalLink, Mail, Phone, WhatsAppIcon } from "@/components/ui/icon";
import { burst } from "@/components/motion/gestures";
import { ConfirmDialog, ErrorState, PageHeader, Segmented, dayKey, errText, formatDay, formatTime, useAction, useData } from "./common";

type Scope = "received" | "sent";
type When = "upcoming" | "past";

const STATUS: Record<VisitStatus, { label: string; tone: "warn" | "success" | "neutral" | "danger" }> = {
  REQUESTED: { label: "Por confirmar", tone: "warn" }, CONFIRMED: { label: "Confirmada", tone: "success" },
  DONE: { label: "Completada", tone: "neutral" }, CANCELLED: { label: "Cancelada", tone: "danger" },
};

export function Visits() {
  const [scope, setScope] = useState<Scope>("received");
  const [when, setWhen] = useState<When>("upcoming");
  const [cancel, setCancel] = useState<VisitRow | null>(null);
  const key = `/visits?scope=${scope}`;
  const { data, error, isLoading, mutate } = useData<VisitRow[]>(key, { refreshInterval: 30_000 });
  const { busy, run } = useAction();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { upcoming, past } = useMemo(() => {
    const limit = Date.now() - 2 * 3600_000;
    const up: VisitRow[] = [], pa: VisitRow[] = [];
    for (const v of data ?? []) ((v.status === "REQUESTED" || v.status === "CONFIRMED") && +new Date(v.scheduledAt) >= limit ? up : pa).push(v);
    up.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    pa.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
    return { upcoming: up, past: pa };
  }, [data]);

  const list = when === "upcoming" ? upcoming : past;
  const groups = useMemo(() => {
    const g: { key: string; label: string; rows: VisitRow[] }[] = [];
    for (const v of list) {
      const k = dayKey(v.scheduledAt);
      const last = g[g.length - 1];
      if (last?.key === k) last.rows.push(v); else g.push({ key: k, label: formatDay(v.scheduledAt), rows: [v] });
    }
    return g;
  }, [list]);

  const setStatus = (v: VisitRow, status: VisitStatus, msg: string) => run(async () => {
    setBusyId(v.id);
    const apply = (rows: VisitRow[] | undefined) => (rows ?? []).map((r) => (r.id === v.id ? { ...r, status } : r));
    try {
      await mutate(async (cur) => { await api(`/visits/${v.id}`, { method: "PATCH", body: { status } }); return apply(cur); }, { optimisticData: (cur) => apply(cur), rollbackOnError: true, populateCache: true, revalidate: true });
      toast.success(msg);
    } catch (e) { toast.error(errText(e)); } finally { setBusyId(null); }
  });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader eyebrow="Mi panel" title="Visitas" description={scope === "received" ? "Agenda de personas que quieren conocer tus inmuebles. Confirma para avisarles." : "Las visitas que has solicitado a otros anunciantes."} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<When> label="Periodo" value={when} onChange={setWhen}
          items={[{ value: "upcoming", label: "Próximas", count: data ? upcoming.length : undefined }, { value: "past", label: "Pasadas", count: data ? past.length : undefined }]} />
        <Segmented<Scope> label="Tipo de visitas" value={scope} onChange={setScope} items={[{ value: "received", label: "Recibidas" }, { value: "sent", label: "Enviadas" }]} />
      </div>

      <div aria-live="polite">
        {error && !data ? <ErrorState error={error} onRetry={() => void mutate()} />
          : isLoading && !data ? <div className="grid grid-cols-[minmax(0,1fr)] gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-[20px]" />)}</div>
          : groups.length === 0 ? (
            <EmptyState icon={<Calendar className="h-6 w-6" />}
              title={when === "upcoming" ? (scope === "received" ? "No tienes visitas próximas" : "No has solicitado visitas") : "Aún no hay visitas pasadas"}
              text={when === "upcoming" ? (scope === "received" ? "Cuando alguien pida una visita a tus inmuebles, la verás aquí para confirmarla." : "Agenda una visita desde la ficha de cualquier inmueble.") : "Aquí quedará el historial de visitas completadas o canceladas."}
              action={scope === "sent" && when === "upcoming" ? <Button href="/venta" variant="outline">Explorar inmuebles</Button> : undefined} />
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
              {groups.map((g) => (
                <section key={g.key} aria-label={g.label}>
                  <h2 className="mb-3 flex items-center gap-3 text-sm font-semibold text-ink-2"><span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />{g.label}<span className="h-px flex-1 bg-line" aria-hidden /></h2>
                  <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
                    {g.rows.map((v) => <VisitCard key={v.id} v={v} scope={scope} loading={busyId === v.id} disabled={busy}
                      onConfirm={() => void setStatus(v, "CONFIRMED", "Visita confirmada. Le avisamos a la persona.")}
                      onDone={() => void setStatus(v, "DONE", "Visita marcada como completada.")}
                      onCancel={() => setCancel(v)} />)}
                  </ul>
                </section>
              ))}
            </div>
          )}
      </div>

      <ConfirmDialog open={!!cancel} onClose={() => setCancel(null)} title="¿Cancelar esta visita?"
        description={cancel && <>{scope === "received" ? `Le avisaremos a ${cancel.name} que la visita a «${cancel.publication.title}» ya no se realizará.` : `Cancelarás tu visita a «${cancel.publication.title}».`} Esta acción no se puede deshacer.</>}
        confirmLabel="Sí, cancelar visita" cancelLabel="Mantener" loading={busy}
        onConfirm={async () => { const v = cancel!; await setStatus(v, "CANCELLED", "Visita cancelada."); setCancel(null); }} />
    </div>
  );
}

function clockParts(iso: string) {
  const parts = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { time: `${get("hour")}:${get("minute")}`, meridiem: get("dayPeriod").replace(/[\s.]/g, "").toLowerCase() };
}

function relative(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const n = abs < 3600 ? Math.max(1, Math.round(abs / 60)) : abs < 86400 ? Math.round(abs / 3600) : Math.round(abs / 86400);
  const unit = abs < 3600 ? "min" : abs < 86400 ? "h" : n === 1 ? "día" : "días";
  return diff >= 0 ? `Dentro de ${n} ${unit}` : `Hace ${n} ${unit}`;
}

function VisitCard({ v, scope, loading, disabled, onConfirm, onDone, onCancel }: { v: VisitRow; scope: Scope; loading: boolean; disabled: boolean; onConfirm: () => void; onDone: () => void; onCancel: () => void }) {
  const st = STATUS[v.status];
  const d = new Date(v.scheduledAt);
  const owner = scope === "received";
  const digits = v.phone?.replace(/\D/g, "") ?? "";
  const wa = digits.length === 10 ? `57${digits}` : digits;
  const active = v.status === "REQUESTED" || v.status === "CONFIRMED";
  const clock = clockParts(v.scheduledAt);

  return (
    <li className={cn("card flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5", loading && "pointer-events-none opacity-70", !active && "bg-surface/40")} aria-busy={loading}>
      <div className="flex shrink-0 items-center gap-4 sm:w-[170px] sm:flex-col sm:items-start sm:justify-between">
        <div>
          <p className="flex items-baseline gap-1.5 font-display text-[2.6rem] leading-none tabular">{clock.time}<span className="font-sans text-sm font-semibold uppercase text-ink-3">{clock.meridiem}</span></p>
          <p className="mt-1.5 text-xs font-medium text-ink-3">{relative(v.scheduledAt)}</p>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] gap-3 border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <Link href={v.publication.path ?? (owner ? `/publicar/${v.publication.id}` : "/venta")} className="group flex items-center gap-3">
          <div className="relative h-14 w-[72px] shrink-0 overflow-hidden rounded-xl"><Photo src={v.publication.coverUrl} alt="" seed={v.publication.code} className="h-full w-full" /></div>
          <div className="min-w-0"><p className="truncate text-[15px] font-semibold group-hover:underline">{v.publication.title}</p><p className="inline-flex items-center gap-1 text-xs text-ink-3">Cód. {v.publication.code}<ExternalLink className="h-3 w-3" /></p></div>
        </Link>

        {owner && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="font-semibold">{v.name}</span>
            <a href={`mailto:${v.email}`} className="inline-flex items-center gap-1.5 text-ink-2 hover:text-brand-700 hover:underline"><Mail className="h-4 w-4" />{v.email}</a>
            {v.phone && <a href={`tel:+${wa}`} className="inline-flex items-center gap-1.5 text-ink-2 hover:text-brand-700 hover:underline"><Phone className="h-4 w-4" />{v.phone}</a>}
            {v.phone && <a href={whatsappLink(wa, `Hola ${v.name.split(" ")[0]}, sobre tu visita a «${v.publication.title}»…`)} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"><WhatsAppIcon className="h-4 w-4" size={16} />WhatsApp</a>}
          </div>
        )}
        {v.note && <p className="rounded-2xl bg-surface px-3.5 py-2.5 text-sm italic text-ink-2">“{v.note}”</p>}
        {!owner && <p className="inline-flex items-center gap-1.5 text-xs text-ink-3"><Clock className="h-3.5 w-3.5" />Solicitada {formatDate(v.createdAt)}</p>}

        {active && (
          <div className="mt-auto flex flex-wrap gap-2">
            {owner && v.status === "REQUESTED" && <Button size="sm" onClick={(e) => { burst("key", e.currentTarget); onConfirm(); }} disabled={disabled}><Check className="h-4 w-4" />Confirmar</Button>}
            {owner && v.status === "CONFIRMED" && <Button size="sm" onClick={(e) => { burst("seal", e.currentTarget); onDone(); }} disabled={disabled}><Check className="h-4 w-4" />Marcar completada</Button>}
            <Button size="sm" variant="outline" onClick={(e) => { burst("reject", e.currentTarget); onCancel(); }} disabled={disabled} className="hover:!border-danger hover:!text-danger"><Ban className="h-4 w-4" />Cancelar</Button>
          </div>
        )}
      </div>
    </li>
  );
}
