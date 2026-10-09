"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { api, ApiException } from "@/lib/api";
import { formatPrice, whatsappLink } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { PublicationDetail } from "@/lib/types";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { BadgeCheck, Check, Phone, ShieldCheck, WhatsAppIcon } from "@/components/ui/icon";

type Pub = Pick<PublicationDetail, "id" | "code" | "title" | "path" | "operation" | "price" | "currency" | "negotiable" | "adminFee" | "contact" | "advertiser" | "status">;
type Errors = Record<string, string[]>;

const SLOTS = [9, 10, 11, 12, 14, 15, 16, 17];
const fmtDay = new Intl.DateTimeFormat("es-CO", { weekday: "short" });
const fmtMonth = new Intl.DateTimeFormat("es-CO", { month: "short" });
const fmtLong = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" });
const fmtHour = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? "p. m." : "a. m."}`;

function nextDays() {
  const now = new Date();
  const out: Date[] = [];
  for (let i = 0; i < 8 && out.length < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (i === 0 && now.getHours() >= 17) continue;
    out.push(d);
  }
  return out;
}

export function ContactCard({ pub, variant = "card" }: { pub: Pub; variant?: "card" | "sheet" }) {
  const { user } = useSession();
  const [tab, setTab] = useState<"msg" | "visit">("msg");
  const defaultMsg = `Hola, me interesa “${pub.title}” (código #${pub.code}). ¿Sigue disponible? Quedo atento.`;
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: defaultMsg, note: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { kind: "msg" | "visit"; when?: string }>(null);
  const [showPhone, setShowPhone] = useState(false);
  const days = useMemo(nextDays, []);
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState<number | null>(null);
  const isPublished = pub.status === "PUBLISHED";

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone || "" }));
  }, [user]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: [] })); };
  const err = (k: string) => errors[k]?.[0];

  const slotOk = (h: number) => { const d = days[day]; if (!d) return false; const t = new Date(d); t.setHours(h, 0, 0, 0); return t.getTime() > Date.now() + 30 * 60_000; };
  useEffect(() => { if (hour !== null && !slotOk(hour)) setHour(null); }, [day]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const local: Errors = {};
    if (form.name.trim().length < 2) local.name = ["Escribe tu nombre"];
    if (!/^\S+@\S+\.\S+$/.test(form.email)) local.email = ["Escribe un correo válido"];
    if (tab === "msg" && form.message.trim().length < 10) local.message = ["Cuéntale algo más al anunciante (mínimo 10 caracteres)"];
    if (tab === "visit" && hour === null) local.scheduledAt = ["Elige un horario"];
    if (Object.keys(local).length) { setErrors(local); return; }
    setBusy(true);
    try {
      if (tab === "msg") {
        await api(`/publications/${pub.id}/inquiries`, { body: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, message: form.message.trim() } });
        setDone({ kind: "msg" });
      } else {
        const d = new Date(days[day]!); d.setHours(hour!, 0, 0, 0);
        await api(`/publications/${pub.id}/visits`, { body: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, scheduledAt: d.toISOString(), note: form.note.trim() || undefined } });
        setDone({ kind: "visit", when: `${fmtLong.format(d)}, ${fmtHour(hour!)}` });
      }
    } catch (x) {
      if (x instanceof ApiException) {
        setErrors(x.errors ?? {});
        if (!x.errors || !Object.keys(x.errors).length) toast.error(x.status === 429 ? "Has enviado muchos mensajes seguidos. Espera un minuto e inténtalo de nuevo." : x.message);
      } else toast.error("No pudimos enviar tu solicitud. Revisa tu conexión.");
    } finally { setBusy(false); }
  };

  const waText = `Hola, vi “${pub.title}” (código #${pub.code}) en Jucaro y me interesa: ${absoluteUrl(pub.path)}`;
  const adv = pub.advertiser;

  return (
    <div className={cn("bg-white", variant === "card" && "rounded-[28px] border border-line p-6 shadow-[var(--shadow-lift)]")}>
      {variant === "card" && (
        <div className="mb-5">
          <p className="flex flex-wrap items-baseline gap-x-2 font-display text-[2.4rem] leading-none tracking-tight tabular">
            {formatPrice(pub.price, pub.currency)}{pub.operation === "RENT" && <span className="font-sans text-base font-medium text-ink-3">/ mes</span>}
          </p>
          {pub.adminFee ? <p className="mt-1.5 text-[13px] text-ink-3">+ {formatPrice(pub.adminFee)} de administración</p> : null}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
        <Avatar name={adv.name} src={adv.avatarUrl} size={44} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold">{adv.name}{adv.verified && <BadgeCheck className="h-[18px] w-[18px] shrink-0 text-brand-600" aria-label="Anunciante verificado" />}</p>
          <p className="truncate text-[13px] text-ink-3">{adv.company ?? (adv.role === "AGENT" ? "Agente inmobiliario" : "Propietario")}</p>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid justify-items-center gap-3 py-8 text-center" role="status">
            <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} className="grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success"><Check className="h-8 w-8" strokeWidth={3} /></motion.span>
            <h3 className="font-display text-[1.9rem] leading-tight">{done.kind === "msg" ? "¡Mensaje enviado!" : "¡Solicitud enviada!"}</h3>
            <p className="max-w-[28ch] text-[15px] text-ink-2">{done.kind === "msg" ? `${adv.name.split(" ")[0]} recibirá tu mensaje y te responderá a ${form.email}.` : `Pediste visitar este inmueble el ${done.when}. El anunciante la confirmará pronto.`}</p>
            {user && <Link href="/panel/mensajes" className="text-sm font-semibold text-brand-700 hover:underline">Ver mis mensajes</Link>}
            <button type="button" onClick={() => setDone(null)} className="text-sm font-semibold text-ink-3 underline underline-offset-4 hover:text-ink">Enviar otro</button>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={submit} noValidate className="mt-5">
            <div role="tablist" aria-label="Tipo de contacto" className="relative mb-5 grid grid-cols-2 border-b border-line">
              {([["msg", "Escríbeme"], ["visit", "Agendar visita"]] as const).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setErrors({}); }} className={cn("relative pb-3 text-[15px] font-semibold transition-colors", tab === k ? "text-ink" : "text-ink-3 hover:text-ink")}>
                  {l}{tab === k && <motion.span layoutId={`contact-tab-${variant}`} className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-brand-600" />}
                </button>
              ))}
            </div>

            <div className="grid gap-3.5">
              {tab === "visit" && (
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold">¿Qué día te queda bien?</legend>
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {days.map((d, i) => (
                      <button key={i} type="button" aria-pressed={day === i} onClick={() => setDay(i)}
                        className={cn("flex h-[68px] w-[58px] shrink-0 flex-col items-center justify-center rounded-2xl border transition active:scale-95", day === i ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong hover:border-ink")}>
                        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{i === 0 && d.toDateString() === new Date().toDateString() ? "Hoy" : fmtDay.format(d).replace(".", "")}</span>
                        <span className="font-display text-[1.7rem] leading-none">{d.getDate()}</span>
                        <span className="text-[10px] uppercase opacity-70">{fmtMonth.format(d).replace(".", "")}</span>
                      </button>
                    ))}
                  </div>
                  <legend className="mb-2 mt-3 text-sm font-semibold">Hora</legend>
                  <div className="grid grid-cols-4 gap-2">
                    {SLOTS.map((h) => (
                      <button key={h} type="button" disabled={!slotOk(h)} aria-pressed={hour === h} onClick={() => { setHour(h); setErrors((e) => ({ ...e, scheduledAt: [] })); }}
                        className={cn("h-10 rounded-xl border text-[13px] font-semibold tabular transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35", hour === h ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong hover:border-ink")}>{fmtHour(h).replace(":00", "")}</button>
                    ))}
                  </div>
                  {err("scheduledAt") && <p role="alert" className="mt-1.5 text-[13px] font-medium text-danger">{err("scheduledAt")}</p>}
                </fieldset>
              )}
              <Input label="Nombre" name="name" autoComplete="name" value={form.name} onChange={set("name")} error={err("name")} required />
              <Input label="Correo" name="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={err("email")} required />
              <Input label="Teléfono (opcional)" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={set("phone")} error={err("phone")} />
              {tab === "msg" ? <Textarea label="Mensaje" name="message" rows={4} value={form.message} onChange={set("message")} error={err("message")} required /> : <Textarea label="Nota para el anunciante (opcional)" name="note" rows={2} value={form.note} onChange={set("note")} error={err("note")} placeholder="Ej. Voy con mi pareja" className="min-h-20" />}
              <Button type="submit" size="lg" loading={busy} disabled={!isPublished} className="w-full">{tab === "msg" ? "Enviar mensaje" : "Solicitar visita"}</Button>
              {!isPublished && <p className="text-center text-[13px] text-ink-3">Este anuncio no está publicado, por eso el contacto está desactivado.</p>}
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {(pub.contact.whatsapp || pub.contact.phone) && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink-3"><span className="h-px flex-1 bg-line" />o contacta directo<span className="h-px flex-1 bg-line" /></div>
          <div className={cn("grid gap-2", pub.contact.whatsapp && pub.contact.phone ? "grid-cols-2" : "grid-cols-1")}>
            {pub.contact.whatsapp && (
              <Button href={whatsappLink(pub.contact.whatsapp, waText)} target="_blank" rel="noopener noreferrer" variant="outline" className="!border-[#25D366]/60 hover:!border-[#25D366] hover:!bg-[#25D366]/10"><WhatsAppIcon className="text-[#1ebe5b]" size={18} />WhatsApp</Button>
            )}
            {pub.contact.phone && (showPhone
              ? <Button href={`tel:${pub.contact.phone.replace(/[^\d+]/g, "")}`} variant="outline"><Phone className="h-[18px] w-[18px]" />{pub.contact.phone}</Button>
              : <Button variant="outline" onClick={() => setShowPhone(true)}><Phone className="h-[18px] w-[18px]" />Ver teléfono</Button>)}
          </div>
        </>
      )}

      <p className="mt-5 flex gap-2.5 rounded-2xl bg-brand-50 p-3.5 text-[13px] leading-snug text-brand-800">
        <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0" />
        <span>Nunca pagues ni envíes dinero antes de conocer el inmueble. <Link href="/ayuda#seguridad" className="font-semibold underline underline-offset-2">Consejos de seguridad</Link></span>
      </p>
    </div>
  );
}
