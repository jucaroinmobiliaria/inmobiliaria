"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mutate as globalMutate } from "swr";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber, plural, timeAgo } from "@/lib/format";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { DashboardSummary, NotificationDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, Skeleton } from "@/components/ui/misc";
import { Photo } from "@/components/ui/photo";
import {
  ArrowRight, Bell, Calendar, Check, CircleAlert, Eye, Heart, Inbox, Lightbulb, MessageCircle, Plus, Sparkles, Building2,
} from "@/components/ui/icon";
import { CountUp, SERIES_COLORS, Sparkline, TimeSeriesChart } from "./charts";
import { Delta, ErrorState, PageHeader, errText, formatDay, formatTime, useAction, useData } from "./common";

const VISIT_STATUS = { REQUESTED: { label: "Por confirmar", tone: "warn" }, CONFIRMED: { label: "Confirmada", tone: "success" }, DONE: { label: "Completada", tone: "neutral" }, CANCELLED: { label: "Cancelada", tone: "neutral" } } as const;

function useGreeting() {
  const [g, setG] = useState("Hola");
  useEffect(() => {
    const h = new Date().getHours();
    setG(h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches");
  }, []);
  return g;
}

export function Overview({ notice }: { notice?: string }) {
  const { user } = useSession();
  const greeting = useGreeting();
  const { data, error, isLoading, mutate } = useData<DashboardSummary>("/dashboard/summary", { refreshInterval: 60_000 });
  const first = user?.name?.split(" ")[0] ?? "";
  const isEmpty = !!data && data.kpis.activeListings + data.kpis.pendingReview + data.kpis.drafts === 0 && data.top.length === 0 && data.recentInquiries.length === 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <PageHeader
        eyebrow="Mi panel"
        title={first ? `${greeting}, ${first}` : greeting}
        description={isEmpty ? "Desde aquí vas a manejar tus avisos, mensajes y visitas." : "Así van tus publicaciones en los últimos 30 días."}
        actions={isEmpty ? undefined : <Button href="/publicar" className="lg:hidden"><Plus className="h-[18px] w-[18px]" />Publicar inmueble</Button>}
      />

      {!!data && data.kpis.pendingReview > 0 && (
        <div role="status" className="flex items-start gap-3 rounded-[20px] border border-sun/40 bg-sun-soft px-5 py-4 text-sun-ink">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm leading-relaxed"><span className="font-semibold">{data.kpis.pendingReview === 1 ? "Tienes 1 aviso en revisión." : `Tienes ${data.kpis.pendingReview} avisos en revisión.`}</span> Un administrador los mira antes de publicarlos. Mientras tanto puedes seguir editándolos.</p>
        </div>
      )}

      {notice === "permiso" && (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-sun-soft px-5 py-4 text-sun-ink">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">No tienes permiso para entrar a esa sección. Si crees que es un error, escríbenos y lo revisamos.</p>
        </div>
      )}

      {error && !data ? <ErrorState error={error} onRetry={() => void mutate()} /> : isLoading && !data ? <OverviewSkeleton /> : data ? <OverviewBody data={data} /> : null}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6" aria-busy="true" aria-label="Cargando resumen">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className={cn("h-[148px] rounded-[20px]", i === 4 && "col-span-2 xl:col-span-1")} />)}</div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><Skeleton className="h-[420px] rounded-[20px]" /><Skeleton className="h-[420px] rounded-[20px]" /></div>
    </div>
  );
}

function OverviewBody({ data }: { data: DashboardSummary }) {
  const k = data.kpis;
  const total = k.activeListings + k.pendingReview + k.drafts;
  const hasActivity = total > 0 || data.top.length > 0 || data.recentInquiries.length > 0;

  if (!hasActivity) {
    return (
      <div className="overflow-hidden rounded-[28px] bg-brand-900 text-white">
        <div className="relative grid gap-8 p-8 md:p-12">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-brand-600/40 blur-3xl" />
          <div className="relative max-w-xl">
            <p className="eyebrow !text-brand-200">Empieza hoy</p>
            <h2 className="display-md mt-2 text-white">Publica tu primer inmueble en minutos</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/80">Sube las fotos, cuéntanos lo esencial y nosotros nos encargamos de mostrarlo. Cuando tengas visitas, favoritos y mensajes los verás aquí, con estadísticas claras.</p>
            <Button href="/publicar" variant="sun" size="lg" className="mt-6"><Plus className="h-5 w-5" />Publicar mi primer inmueble</Button>
          </div>
          <ul className="relative grid gap-3 text-sm text-white/85 sm:grid-cols-3">
            {["Gratis y sin intermediarios", "Fotos, mapa y contacto directo", "Estadísticas de cada aviso"].map((t) => (
              <li key={t} className="flex items-center gap-2.5 rounded-2xl bg-white/10 px-4 py-3"><Check className="h-4 w-4 text-brand-200" />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const views = data.series.map((s) => s.views);
  const favs = data.series.map((s) => s.favorites);
  const inqs = data.series.map((s) => s.inquiries);

  return (
    <>
      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Kpi href="/panel/publicaciones" label="Publicaciones activas" value={k.activeListings}
          foot={<span className="flex flex-wrap gap-x-2 text-xs leading-snug text-ink-3"><span className="whitespace-nowrap">{k.pendingReview} en revisión</span><span className="whitespace-nowrap">{plural(k.drafts, "borrador", "borradores")}</span></span>} icon={<Building2 className="h-4 w-4" />} />
        <Kpi label="Vistas · 30 días" value={k.views30d} delta={k.viewsDelta} spark={views} color={SERIES_COLORS.green} icon={<Eye className="h-4 w-4" />} />
        <Kpi href="/panel/mensajes" label="Contactos · 30 días" value={k.inquiries30d} delta={k.inquiriesDelta} spark={inqs} color={SERIES_COLORS.blue} icon={<MessageCircle className="h-4 w-4" />} />
        <Kpi label="Favoritos · 30 días" value={k.favorites30d} spark={favs} color={SERIES_COLORS.amber} icon={<Heart className="h-4 w-4" />} foot={<span className="text-xs leading-snug text-ink-3">Por interesados</span>} />
        <Kpi href="/panel/visitas" className="col-span-2 xl:col-span-1" label="Visitas pendientes" value={k.visitsPending} icon={<Calendar className="h-4 w-4" />}
          foot={<span className="text-xs leading-snug text-ink-3">{k.visitsPending > 0 ? "Por confirmar" : "Todo al día"}</span>} />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card p-5 md:p-6" aria-labelledby="rend">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><h2 id="rend" className="text-lg font-semibold">Rendimiento</h2><p className="text-sm text-ink-3">Últimos 30 días · activa o desactiva cada serie</p></div>
          </div>
          <TimeSeriesChart
            title="Rendimiento de tus publicaciones" data={data.series} defaultActive={["views"]}
            series={[
              { key: "views", label: "Vistas", color: SERIES_COLORS.green },
              { key: "favorites", label: "Favoritos", color: SERIES_COLORS.amber },
              { key: "inquiries", label: "Contactos", color: SERIES_COLORS.blue },
            ]}
          />
        </section>
        <NotificationsCard />
      </div>

      <TopListings top={data.top} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <RecentInquiries rows={data.recentInquiries} />
        <UpcomingVisits rows={data.upcomingVisits} />
      </div>

      {data.tips.length > 0 && (
        <section aria-labelledby="tips" className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <h2 id="tips" className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5 text-sun" />Para vender o arrendar más rápido</h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.tips.map((t) => (
              <article key={t.id} className={cn("flex flex-col gap-3 rounded-[20px] p-5", t.tone === "warn" ? "bg-sun-soft text-sun-ink" : "bg-brand-50 text-brand-800")}>
                <div className="flex items-start gap-3">
                  <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white", t.tone === "warn" ? "text-sun-ink" : "text-brand-600")}>{t.tone === "warn" ? <CircleAlert className="h-[18px] w-[18px]" /> : <Lightbulb className="h-[18px] w-[18px]" />}</span>
                  <p className="text-[15px] leading-relaxed">{t.text}</p>
                </div>
                {t.cta && <Link href={t.cta.href} className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-[0_1px_2px_rgb(14_21_18/0.08)] transition hover:shadow-[var(--shadow-card)]">{t.cta.label}<ArrowRight className="h-4 w-4" /></Link>}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Kpi({ label, value, delta, spark, color, href, foot, icon, className }: {
  label: string; value: number; delta?: number; spark?: number[]; color?: string; href?: string; foot?: React.ReactNode; icon?: React.ReactNode; className?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2 text-ink-3">
        <span className="text-[13px] font-medium leading-tight">{label}</span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface">{icon}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="shrink-0 font-display text-[2.5rem] leading-none tabular text-ink sm:text-[2.9rem]"><CountUp value={value} /></p>
        {spark && spark.length > 1 && <div className="mb-1 min-w-0 max-w-14 flex-1"><Sparkline values={spark} color={color} width={56} height={30} className="h-auto w-full" /></div>}
      </div>
      <div className="mt-auto min-h-6 pt-3">{delta != null ? <Delta value={delta} /> : foot}</div>
    </>
  );
  const cls = cn("card flex flex-col p-4 md:p-5", href && "card-lift", className);
  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

function TopListings({ top }: { top: DashboardSummary["top"] }) {
  return (
    <section aria-labelledby="top" className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex items-end justify-between gap-3">
        <h2 id="top" className="text-lg font-semibold">Tus publicaciones destacadas</h2>
        <Link href="/panel/publicaciones" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">Ver todas<ArrowRight className="h-4 w-4" /></Link>
      </div>
      {top.length === 0 ? (
        <EmptyState icon={<Eye className="h-6 w-6" />} title="Aún no hay datos de rendimiento" text="Cuando tus avisos estén publicados, aquí verás cuáles reciben más atención." />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {top.slice(0, 3).map((t, i) => (
            <li key={t.id}>
              <Link href={t.path ?? `/publicar/${t.id}`} className="card card-lift group block overflow-hidden">
                <div className="relative aspect-[16/10]">
                  <Photo src={t.coverUrl} alt={t.title} seed={i + t.title.length} className="absolute inset-0 h-full w-full" imgClassName="transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute left-3 top-3 grid h-8 min-w-8 place-items-center rounded-full bg-white/95 px-2 text-sm font-bold text-brand-700 shadow">#{i + 1}</span>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-1 text-[15px] font-semibold">{t.title}</h3>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <Stat icon={<Eye className="h-3.5 w-3.5" />} label="Vistas" value={t.views} />
                    <Stat icon={<Heart className="h-3.5 w-3.5" />} label="Favoritos" value={t.favorites} />
                    <Stat icon={<MessageCircle className="h-3.5 w-3.5" />} label="Contactos" value={t.inquiries} />
                  </dl>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface px-2 py-2">
      <dt className="flex items-center justify-center gap-1 text-[11px] font-medium text-ink-3">{icon}{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular">{formatNumber(value)}</dd>
    </div>
  );
}

function RecentInquiries({ rows }: { rows: DashboardSummary["recentInquiries"] }) {
  return (
    <section className="card p-5 md:p-6" aria-labelledby="ri">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="ri" className="text-lg font-semibold">Consultas recientes</h2>
        <Link href="/panel/mensajes" className="text-sm font-semibold text-brand-700 hover:underline">Ver mensajes</Link>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-ink-2"><Inbox className="mx-auto mb-2 h-6 w-6 text-ink-3" />Aún no tienes consultas. Cuando alguien te escriba, aparecerá aquí.</p>
      ) : (
        <ul className="-mx-2 grid grid-cols-[minmax(0,1fr)]">
          {rows.slice(0, 5).map((r) => (
            <li key={r.id}>
              <Link href={`/panel/mensajes?id=${r.id}`} className="flex items-start gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-surface">
                <div className="relative"><Avatar name={r.name} size={40} />{r.unread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-heart" aria-label="Sin leer" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2"><p className={cn("truncate text-sm", r.unread ? "font-bold" : "font-semibold")}>{r.name}</p><span className="shrink-0 text-xs text-ink-3">{timeAgo(r.lastMessageAt)}</span></div>
                  <p className="truncate text-[13px] text-ink-2">{r.lastMessage}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-3">{r.publication.title}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UpcomingVisits({ rows }: { rows: DashboardSummary["upcomingVisits"] }) {
  return (
    <section className="card p-5 md:p-6" aria-labelledby="uv">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="uv" className="text-lg font-semibold">Próximas visitas</h2>
        <Link href="/panel/visitas" className="text-sm font-semibold text-brand-700 hover:underline">Ver agenda</Link>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-ink-2"><Calendar className="mx-auto mb-2 h-6 w-6 text-ink-3" />No tienes visitas agendadas por ahora.</p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          {rows.slice(0, 4).map((v) => {
            const d = new Date(v.scheduledAt);
            const s = VISIT_STATUS[v.status];
            return (
              <li key={v.id}>
                <Link href="/panel/visitas" className="flex items-center gap-3.5 rounded-2xl border border-line p-3 transition hover:border-line-strong hover:bg-surface/60">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700" aria-hidden>
                    <div className="text-center leading-none"><div className="font-display text-2xl">{d.getDate()}</div><div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider">{formatDate(v.scheduledAt, { month: "short" })}</div></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.name}</p>
                    <p className="truncate text-[13px] text-ink-2">{v.publication.title}</p>
                    <p className="mt-0.5 text-xs text-ink-3">{formatDay(v.scheduledAt)} · {formatTime(v.scheduledAt)}</p>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function NotificationsCard() {
  const { data, error, isLoading, mutate } = useData<NotificationDTO[]>("/notifications", { refreshInterval: 45_000 });
  const { busy, run } = useAction();
  const unread = data?.filter((n) => !n.readAt).length ?? 0;

  const markAll = () => run(async () => {
    try {
      await mutate(async (cur) => { await api("/notifications/read-all", { method: "POST" }); return cur?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })); }, { revalidate: false, optimisticData: (cur) => cur?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? [], rollbackOnError: true });
      void globalMutate("session");
      toast.success("Notificaciones marcadas como leídas");
    } catch (e) { toast.error(errText(e)); }
  });

  return (
    <section className="card flex flex-col p-5 md:p-6" aria-labelledby="nt">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="nt" className="flex items-center gap-2 text-lg font-semibold"><Bell className="h-5 w-5 text-ink-3" />Notificaciones{unread > 0 && <Badge tone="danger" className="!px-2">{unread}</Badge>}</h2>
        {unread > 0 && <button type="button" onClick={markAll} disabled={busy} className="text-sm font-semibold text-brand-700 hover:underline disabled:opacity-50">Marcar leídas</button>}
      </div>
      {error && !data ? <ErrorState compact error={error} onRetry={() => void mutate()} /> : isLoading && !data ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data?.length ? (
        <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-ink-2">Estás al día. No tienes notificaciones.</p>
      ) : (
        <ul className="-mx-2 max-h-[340px] overflow-y-auto pr-1">
          {data.map((n) => {
            const body = (
              <div className="flex items-start gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-brand-500")} aria-label={n.readAt ? undefined : "Nueva"} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm leading-snug", n.readAt ? "text-ink-2" : "font-semibold")}>{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-3">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-ink-3">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.link ? <Link href={n.link}>{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </section>
  );
}
