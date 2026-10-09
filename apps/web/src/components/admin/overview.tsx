"use client";

import Link from "next/link";
import type { AdminOverview } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { Building2, CircleCheck, Clock, Flag, ListChecks, MessageCircle, Users, Database, ArrowRight, UserPlus } from "@/components/ui/icon";
import { SERIES_COLORS } from "@/components/panel/charts";
import { ErrorState, PageHeader, useData } from "@/components/panel/common";
import { BarList, Chart, SectionCard, StatCard } from "./ui";

export function AdminOverviewPage() {
  const { data, error, isLoading, mutate } = useData<AdminOverview>("/admin/overview", { refreshInterval: 60_000 });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
      <PageHeader eyebrow="Administración" title="Resumen de la plataforma" description="Estado general, colas de trabajo y actividad de los últimos 30 días."
        actions={<Button href="/admin/moderacion" variant="dark"><ListChecks className="h-[18px] w-[18px]" />Ir a moderación</Button>} />

      {error && !data ? <ErrorState error={error} onRetry={() => void mutate()} /> : isLoading && !data ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6"><div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-[20px]" />)}</div><Skeleton className="h-[420px] rounded-[20px]" /></div>
      ) : data ? <Body d={data} /> : null}
    </div>
  );
}

function Body({ d }: { d: AdminOverview }) {
  const spark = (k: "users" | "publications" | "inquiries") => d.series.map((s) => s[k]);
  return (
    <>
      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-12">
        <StatCard label="Usuarios" value={d.users} icon={<Users className="h-4 w-4" />} href="/admin/usuarios" hint="Registrados" className="lg:col-span-3" />
        <StatCard label="Publicaciones" value={d.publications} icon={<Building2 className="h-4 w-4" />} href="/admin/publicaciones" spark={spark("publications")} color={SERIES_COLORS.amber} hint="En todos los estados" className="lg:col-span-3" />
        <StatCard label="Publicadas" value={d.published} icon={<CircleCheck className="h-4 w-4" />} href="/admin/publicaciones?status=PUBLISHED" hint="Visibles en el sitio" className="lg:col-span-3" />
        <StatCard label="En revisión" value={d.pendingReview} icon={<Clock className="h-4 w-4" />} tone="attention" href="/admin/moderacion" hint={d.pendingReview > 0 ? "Esperando revisión" : "Cola vacía"} className="lg:col-span-3" />
        <StatCard label="Reportes abiertos" value={d.openReports} icon={<Flag className="h-4 w-4" />} tone="danger" href="/admin/reportes" hint={d.openReports > 0 ? "Requieren atención" : "Sin pendientes"} className="lg:col-span-4" />
        <StatCard label="Consultas · 30 d" value={d.inquiries30d} icon={<MessageCircle className="h-4 w-4" />} spark={spark("inquiries")} color={SERIES_COLORS.blue} hint="Mensajes a anunciantes" className="lg:col-span-4" />
        <StatCard label="Nuevos usuarios · 30 d" value={d.newUsers30d} icon={<UserPlus className="h-4 w-4" />} spark={spark("users")} color={SERIES_COLORS.green} hint="Altas recientes" className="col-span-2 lg:col-span-4" />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard title="Actividad" description="Últimos 30 días · activa o desactiva cada serie">
          <Chart title="Actividad de la plataforma" data={d.series} height={300}
            series={[
              { key: "users", label: "Usuarios", color: SERIES_COLORS.green },
              { key: "publications", label: "Publicaciones", color: SERIES_COLORS.amber },
              { key: "inquiries", label: "Consultas", color: SERIES_COLORS.blue },
            ]} />
        </SectionCard>

        <div className="grid content-start gap-6">
          <SectionCard title="Colas de trabajo">
            <ul className="grid gap-2.5">
              <Queue href="/admin/moderacion" icon={<ListChecks className="h-5 w-5" />} title="Publicaciones por revisar" count={d.pendingReview} cta={d.pendingReview ? "Revisar ahora" : "Todo al día"} tone="attention" />
              <Queue href="/admin/reportes" icon={<Flag className="h-5 w-5" />} title="Reportes abiertos" count={d.openReports} cta={d.openReports ? "Atender" : "Sin reportes"} tone="danger" />
              <Queue href="/admin/usuarios" icon={<Users className="h-5 w-5" />} title="Usuarios registrados" count={d.users} cta="Gestionar" />
              <Queue href="/admin/catalogos" icon={<Database className="h-5 w-5" />} title="Catálogos de la plataforma" cta="Editar tipos, ciudades…" />
            </ul>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Publicaciones por ciudad" description="Avisos publicados en cada ciudad">
        {d.byCity.length === 0 ? <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-ink-2">Aún no hay publicaciones para mostrar.</p>
          : <BarList items={[...d.byCity].sort((a, b) => b.count - a.count).slice(0, 10)} />}
      </SectionCard>
    </>
  );
}

function Queue({ href, icon, title, count, cta, tone }: { href: string; icon: React.ReactNode; title: string; count?: number; cta: string; tone?: "attention" | "danger" }) {
  const hot = (count ?? 0) > 0 && tone;
  return (
    <li>
      <Link href={href} className={`group flex items-center gap-3.5 rounded-2xl border p-3.5 transition hover:border-ink ${hot ? (tone === "danger" ? "border-danger/30 bg-danger-soft/40" : "border-sun/50 bg-sun-soft/50") : "border-line"}`}>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white ${hot ? (tone === "danger" ? "text-danger" : "text-sun-ink") : "text-brand-600"}`}>{icon}</span>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-ink-3">{cta}</p></div>
        {count != null && <span className="text-xl font-semibold tabular">{count.toLocaleString("es-CO")}</span>}
        <ArrowRight className="h-4 w-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
      </Link>
    </li>
  );
}
