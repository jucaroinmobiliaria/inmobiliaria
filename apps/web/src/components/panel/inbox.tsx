"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatPrice, timeAgo, whatsappLink } from "@/lib/format";
import { SITE } from "@/lib/site";
import { toast } from "@/lib/toast";
import { burst } from "@/components/motion/gestures";
import type { InquiryMessageDTO, InquiryRow, InquiryStatus, InquiryThread } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, Skeleton } from "@/components/ui/misc";
import { Photo } from "@/components/ui/photo";
import { ArrowDown, ArrowLeft, ExternalLink, Inbox as InboxIcon, Mail, MessageCircle, Phone, Send, WhatsAppIcon } from "@/components/ui/icon";
import { ErrorState, PageHeader, Segmented, dayKey, errText, formatDay, formatTime, useData } from "./common";

const STATUS: Record<InquiryStatus, { label: string; tone: "info" | "success" | "neutral" }> = {
  NEW: { label: "Nuevo", tone: "info" }, REPLIED: { label: "Respondido", tone: "success" }, CLOSED: { label: "Cerrado", tone: "neutral" },
};
type Scope = "received" | "sent";

export function Inbox() {
  const router = useRouter();
  const sp = useSearchParams();
  const id = sp.get("id");
  const [scope, setScope] = useState<Scope>("received");
  const [status, setStatus] = useState<"" | InquiryStatus>("");

  const listKey = `/inquiries?scope=${scope}${status ? `&status=${status}` : ""}`;
  const { data: rows, error, isLoading, mutate } = useData<InquiryRow[]>(listKey, { refreshInterval: 15_000 });

  // Si llegamos con ?id= de una conversación enviada, cambiamos de pestaña automáticamente.
  const missing = !!id && scope === "received" && !status && !!rows && !rows.some((r) => r.id === id);
  const { data: sentRows } = useData<InquiryRow[]>(missing ? "/inquiries?scope=sent" : null);
  useEffect(() => { if (missing && sentRows?.some((r) => r.id === id)) setScope("sent"); }, [missing, sentRows, id]);

  const open = useCallback((rid: string | null) => {
    router.push(rid ? `/panel/mensajes?id=${rid}` : "/panel/mensajes", { scroll: false });
  }, [router]);

  const unreadCount = rows?.filter((r) => r.unread).length ?? 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <PageHeader eyebrow="Mi panel" title="Mensajes" className={cn(id && "hidden xl:flex")}
        description={scope === "received" ? "Responde rápido a tus interesados: los primeros minutos son los que más cuentan." : "Las consultas que has enviado a otros anunciantes."} />

      <div className={cn("card grid min-h-[420px] grid-cols-[minmax(0,1fr)] overflow-hidden xl:h-[min(760px,calc(100dvh-17rem))] xl:grid-cols-[350px_minmax(0,1fr)]", id ? "h-[calc(100dvh-16.5rem-env(safe-area-inset-bottom))]" : "h-[calc(100dvh-14.5rem)]")}>
        {/* Lista */}
        <section aria-label="Conversaciones" className={cn("min-h-0 flex-col border-line xl:flex xl:border-r", id ? "hidden" : "flex")}>
          <div className="grid gap-2.5 border-b border-line p-3.5">
            <Segmented<Scope> label="Tipo de mensajes" value={scope} onChange={(s) => { setScope(s); setStatus(""); }} className="w-full [&>button]:flex-1"
              items={[{ value: "received", label: "Recibidos" }, { value: "sent", label: "Enviados" }]} />
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="f-status">Filtrar por estado</label>
              <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as "" | InquiryStatus)}
                className="h-9 flex-1 rounded-full border border-line-strong bg-white px-3.5 text-sm font-semibold text-ink-2 hover:border-ink focus:border-brand-600 focus:outline-none">
                <option value="">Todos los estados</option><option value="NEW">Nuevos</option><option value="REPLIED">Respondidos</option><option value="CLOSED">Cerrados</option>
              </select>
              {scope === "received" && unreadCount > 0 && <Badge tone="danger">{unreadCount} sin leer</Badge>}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto" role="list">
            {error && !rows ? <div className="p-4"><ErrorState compact error={error} onRetry={() => void mutate()} /></div>
              : isLoading && !rows ? <ListSkeleton />
              : !rows?.length ? (
                <div className="p-4"><EmptyState icon={<InboxIcon className="h-6 w-6" />} title={status ? "Sin resultados" : scope === "received" ? "Aún no tienes mensajes" : "No has enviado consultas"}
                  text={status ? "Prueba con otro estado." : scope === "received" ? "Cuando alguien se interese por tus inmuebles, la conversación aparecerá aquí." : "Escríbele a un anunciante desde la ficha de un inmueble."}
                  action={status ? <Button variant="outline" size="sm" onClick={() => setStatus("")}>Quitar filtro</Button> : scope === "sent" ? <Button href="/venta" size="sm" variant="outline">Explorar inmuebles</Button> : undefined} /></div>
              ) : rows.map((r) => <ConversationItem key={r.id} r={r} scope={scope} active={r.id === id} />)}
          </div>
        </section>

        {/* Conversación */}
        <section aria-label="Conversación" className={cn("min-h-0 min-w-0 xl:flex", id ? "flex" : "hidden")}>
          {id ? <ThreadView key={id} id={id} scope={scope} onBack={() => open(null)} onListChanged={() => { void mutate(); void globalMutate((k) => typeof k === "string" && k.startsWith("/inquiries?scope=")); }} />
            : (
              <div className="grid w-full place-items-center p-8 text-center">
                <div className="max-w-xs">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600"><MessageCircle className="h-7 w-7" /></span>
                  <h2 className="display-md mt-4 !text-[1.7rem]">Elige una conversación</h2>
                  <p className="mt-2 text-sm text-ink-2">Selecciona un mensaje a la izquierda para leerlo y responder.</p>
                </div>
              </div>
            )}
        </section>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return <div className="grid gap-1 p-3" aria-hidden>{Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="flex gap-3 rounded-2xl p-3"><Skeleton className="h-11 w-11 shrink-0 rounded-full" /><div className="grid flex-1 gap-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3.5 w-full" /><Skeleton className="h-3 w-2/3" /></div></div>
  ))}</div>;
}

function ConversationItem({ r, scope, active }: { r: InquiryRow; scope: Scope; active: boolean }) {
  const title = scope === "received" ? r.name : r.publication.title;
  return (
    <Link href={`/panel/mensajes?id=${r.id}`} scroll={false} role="listitem" aria-current={active ? "true" : undefined}
      className={cn("relative flex gap-3 border-b border-line/70 px-4 py-3.5 transition-colors hover:bg-surface/70", active && "bg-brand-50/70 hover:bg-brand-50/70")}>
      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-600" aria-hidden />}
      <div className="relative shrink-0">
        {scope === "received" ? <Avatar name={r.name} size={44} /> : <div className="relative h-11 w-11 overflow-hidden rounded-full"><Photo src={r.publication.coverUrl} alt="" seed={r.publication.code} className="h-full w-full" /></div>}
        {r.unread && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-heart" role="img" aria-label="Sin leer" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("truncate text-[15px]", r.unread ? "font-bold" : "font-semibold")}>{title}</p>
          <time dateTime={r.lastMessageAt} className="shrink-0 text-xs text-ink-3">{timeAgo(r.lastMessageAt)}</time>
        </div>
        <p className={cn("mt-0.5 line-clamp-1 text-[13px]", r.unread ? "font-medium text-ink" : "text-ink-2")}>{r.lastMessage}</p>
        <div className="mt-1.5 flex items-center gap-2">
          {scope === "received" && <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-md"><Photo src={r.publication.coverUrl} alt="" seed={r.publication.code} className="h-full w-full" /></span>}
          <p className="min-w-0 flex-1 truncate text-xs text-ink-3">{scope === "received" ? r.publication.title : `Cód. ${r.publication.code}`}</p>
          <Badge tone={STATUS[r.status].tone} className="!px-2 !py-0.5 !text-[11px]">{STATUS[r.status].label}</Badge>
        </div>
      </div>
    </Link>
  );
}

/* ---------------------------------------------------------------- Hilo */

type Pending = { tmp: string; body: string; createdAt: string; failed?: boolean };

function ThreadView({ id, scope, onBack, onListChanged }: { id: string; scope: Scope; onBack: () => void; onListChanged: () => void }) {
  const key = `/inquiries/${id}`;
  const { data, error, isLoading, mutate } = useData<InquiryThread>(key, { refreshInterval: 8000, refreshWhenHidden: false, revalidateOnFocus: true });
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const lastCount = useRef(0);
  const [newBelow, setNewBelow] = useState(false);
  const markedRead = useRef(false);

  // El GET marca como leído (si eres el dueño): refrescamos la lista una vez.
  useEffect(() => {
    if (data && !markedRead.current) { markedRead.current = true; if (scope === "received") onListChanged(); }
  }, [data, scope, onListChanged]);

  const mineOf = useCallback((m: InquiryMessageDTO) => (scope === "received" ? m.fromOwner : !m.fromOwner), [scope]);
  const messages = data?.messages ?? [];

  const toBottom = useCallback((smooth = true) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useLayoutEffect(() => { if (data && lastCount.current === 0) { toBottom(false); lastCount.current = messages.length; } }, [data, messages.length, toBottom]);

  useEffect(() => {
    if (lastCount.current === 0) return;
    const grew = messages.length > lastCount.current;
    const lastMsg = messages[messages.length - 1];
    if (grew || pending.length) {
      if (stick.current || (lastMsg && mineOf(lastMsg)) || pending.length) toBottom(true);
      else if (grew) setNewBelow(true);
    }
    lastCount.current = messages.length;
  }, [messages, pending.length, mineOf, toBottom]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (stick.current) setNewBelow(false);
  };

  const resize = () => { const t = ta.current; if (t) { t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 140)}px`; } };
  useEffect(resize, [text]);

  const send = () => {
    const body = text.trim();
    if (!body || !data) return;
    burst("plane", document.getElementById("composer-send"));
    const tmp = `tmp-${Date.now()}`;
    setPending((p) => [...p, { tmp, body, createdAt: new Date().toISOString() }]);
    setText("");
    stick.current = true;
    void (async () => {
      try {
        const msg = await api<InquiryMessageDTO>(`/inquiries/${id}/messages`, { method: "POST", body: { body } });
        await mutate((cur) => cur && ({ ...cur, status: scope === "received" ? "REPLIED" : cur.status, lastMessage: body, messages: cur.messages.some((m) => m.id === msg.id) ? cur.messages : [...cur.messages, msg] }), { revalidate: false });
        setPending((p) => p.filter((x) => x.tmp !== tmp));
        onListChanged();
      } catch (e) {
        setPending((p) => p.filter((x) => x.tmp !== tmp));
        setText((t) => t || body);
        toast.error(errText(e, "No se pudo enviar el mensaje. Inténtalo de nuevo."));
      }
    })();
  };

  const setStatus = (s: InquiryStatus) => {
    if (!data || data.status === s) return;
    void mutate(async (cur) => { await api(`/inquiries/${id}`, { method: "PATCH", body: { status: s } }); return cur && { ...cur, status: s }; },
      { optimisticData: (cur) => (cur ? { ...cur, status: s } : (cur as unknown as InquiryThread)), rollbackOnError: true, revalidate: false })
      .then(() => { toast.success(`Conversación marcada como ${STATUS[s].label.toLowerCase()}`); onListChanged(); })
      .catch((e) => toast.error(errText(e)));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

  const days = useMemo(() => {
    type Item = { kind: "day"; key: string; label: string } | { kind: "msg"; key: string; m: InquiryMessageDTO | (Pending & { pending: true }); mine: boolean };
    const items: Item[] = [];
    let last = "";
    const all = [...messages.map((m) => ({ m, mine: mineOf(m) })), ...pending.map((p) => ({ m: { ...p, pending: true as const }, mine: true }))];
    for (const { m, mine } of all) {
      const dk = dayKey(m.createdAt);
      if (dk !== last) { items.push({ kind: "day", key: `d-${dk}`, label: formatDay(m.createdAt) }); last = dk; }
      items.push({ kind: "msg", key: "id" in m ? m.id : (m as Pending).tmp, m, mine });
    }
    return items;
  }, [messages, pending, mineOf]);

  if (error && !data) {
    return <div className="grid w-full place-items-center p-6"><div className="max-w-md"><button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 xl:hidden"><ArrowLeft className="h-4 w-4" />Volver</button><ErrorState error={error} onRetry={() => void mutate()} /></div></div>;
  }
  if (isLoading && !data) {
    return <div className="flex w-full flex-col gap-4 p-5" aria-busy="true"><Skeleton className="h-16" /><Skeleton className="h-20" /><div className="mt-auto grid gap-3"><Skeleton className="ml-auto h-12 w-2/3" /><Skeleton className="h-12 w-1/2" /><Skeleton className="h-14" /></div></div>;
  }
  if (!data) return null;

  const owner = scope === "received";
  const phone = data.phone?.replace(/\D/g, "") ?? "";
  const waPhone = phone.length === 10 ? `57${phone}` : phone;

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col">
      {/* Cabecera */}
      <header className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
        <button type="button" onClick={onBack} aria-label="Volver a la lista" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-surface xl:hidden"><ArrowLeft className="h-5 w-5" /></button>
        {owner ? <Avatar name={data.name} size={42} /> : <div className="h-[42px] w-[42px] shrink-0 overflow-hidden rounded-full"><Photo src={data.publication.coverUrl} alt="" seed={data.publication.code} className="h-full w-full" /></div>}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{owner ? data.name : data.publication.title}</h2>
          <p className="truncate text-[13px] text-ink-3">{owner ? data.email : `Consulta enviada · ${timeAgo(data.createdAt)}`}</p>
        </div>
        {owner ? (
          <div className="shrink-0">
            <label htmlFor="th-status" className="sr-only">Estado de la conversación</label>
            <select id="th-status" value={data.status} onChange={(e) => setStatus(e.target.value as InquiryStatus)}
              className={cn("h-10 rounded-full border bg-white px-3.5 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-brand-600/15", data.status === "NEW" ? "border-info/40 text-info" : data.status === "REPLIED" ? "border-success/40 text-success" : "border-line-strong text-ink-2")}>
              <option value="NEW">Nuevo</option><option value="REPLIED">Respondido</option><option value="CLOSED">Cerrado</option>
            </select>
          </div>
        ) : <Badge tone={STATUS[data.status].tone}>{STATUS[data.status].label}</Badge>}
      </header>

      {/* Inmueble + contacto */}
      <div className="grid gap-2.5 border-b border-line bg-surface/50 px-3 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl"><Photo src={data.publication.coverUrl} alt="" seed={data.publication.code} className="h-full w-full" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{data.publication.title}</p>
            <p className="flex items-center gap-1.5 whitespace-nowrap text-xs text-ink-3">Cód. {data.publication.code}{data.publication.path && <><span aria-hidden>·</span><Link href={data.publication.path} target="_blank" className="inline-flex items-center gap-0.5 font-semibold text-brand-700 hover:underline">Ver aviso<ExternalLink className="h-3 w-3" /></Link></>}</p>
          </div>
        </div>
        {owner && (
          <div className="flex flex-wrap gap-2" aria-label="Contactar a la persona">
            <Button size="sm" variant="outline" href={`mailto:${data.email}?subject=${encodeURIComponent(`Sobre: ${data.publication.title}`)}`} aria-label={`Escribir un correo a ${data.name}`} target="_blank"><Mail className="h-4 w-4" />Correo</Button>
            {data.phone && <Button size="sm" variant="outline" href={`tel:+${waPhone}`} aria-label={`Llamar a ${data.name}`}><Phone className="h-4 w-4" /><span className="sm:hidden">Llamar</span><span className="hidden sm:inline">{data.phone}</span></Button>}
            {data.phone && <Button size="sm" variant="soft" href={whatsappLink(waPhone, `Hola ${data.name.split(" ")[0]}, te escribo por «${data.publication.title}» en ${SITE.name}.`)} target="_blank" rel="noopener" aria-label={`Abrir WhatsApp con ${data.name}`}><WhatsAppIcon className="h-4 w-4" />WhatsApp</Button>}
          </div>
        )}
      </div>

      {/* Mensajes */}
      <div className="relative min-h-0 flex-1">
        <div ref={scroller} onScroll={onScroll} role="log" aria-live="polite" aria-relevant="additions" aria-label="Mensajes de la conversación" className="h-full overflow-y-auto px-3 py-4 sm:px-5">
          <ol className="mx-auto grid max-w-3xl gap-1.5">
            {days.map((it) => it.kind === "day" ? (
              <li key={it.key} className="my-2 text-center"><span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-3">{it.label}</span></li>
            ) : (
              <li key={it.key} className={cn("flex flex-col", it.mine ? "items-end" : "items-start")}>
                <div className={cn("max-w-[86%] whitespace-pre-wrap break-words rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-[75%]",
                  it.mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-surface-2 text-ink", "pending" in it.m && "opacity-60")}>
                  {it.m.body}
                </div>
                <span className="mt-0.5 px-1 text-[11px] text-ink-3">{"pending" in it.m ? "Enviando…" : <>{!it.mine && (it.m as InquiryMessageDTO).senderName ? `${(it.m as InquiryMessageDTO).senderName.split(" ")[0]} · ` : ""}{formatTime(it.m.createdAt)}</>}</span>
              </li>
            ))}
          </ol>
        </div>
        {newBelow && (
          <button type="button" onClick={() => { toBottom(); setNewBelow(false); }} className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-pop)]">
            <ArrowDown className="h-4 w-4" />Mensaje nuevo
          </button>
        )}
      </div>

      {/* Redactar */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-line bg-white p-3 sm:px-5">
        {data.status === "CLOSED" && <p className="mb-2 text-xs text-ink-3">Esta conversación está cerrada. Si respondes, seguirá disponible para ambas partes.</p>}
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <label htmlFor="composer" className="sr-only">Escribe tu respuesta</label>
          <textarea id="composer" ref={ta} rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} maxLength={2000}
            placeholder={owner ? "Escribe tu respuesta…" : "Escribe un mensaje…"}
            className="max-h-[140px] min-h-[46px] flex-1 resize-none rounded-[22px] border border-field/60 bg-white px-4 py-3 text-[15px] leading-snug placeholder:text-ink-3 hover:border-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15" />
          <Button id="composer-send" type="submit" size="icon" aria-label="Enviar mensaje" disabled={!text.trim()} className="shrink-0 overflow-visible"><Send className="h-5 w-5" /></Button>
        </div>
        <p className="mx-auto mt-1.5 hidden max-w-3xl px-2 text-[11px] text-ink-3 sm:block"><kbd className="font-sans font-semibold">Enter</kbd> para enviar · <kbd className="font-sans font-semibold">Shift + Enter</kbd> para nueva línea</p>
      </form>
    </div>
  );
}
