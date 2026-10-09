"use client";

import Link from "next/link";
import { useState } from "react";
import { PropertyCard } from "@/components/property/property-card";
import { Checkbox } from "@/components/ui/form";
import { Icon, WhatsAppIcon } from "@/components/ui/icon";
import { Photo } from "@/components/ui/photo";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { formatNumber, formatPrice } from "@/lib/format";
import { OPERATION_LABEL } from "@/lib/site";
import type { ImageDTO, PublicationCard } from "@/lib/types";
import { Check, CircleAlert, Clock, Eye, MapPin, Pencil, MessageCircle, Rocket } from "@/components/uploader/icons";
import { Callout } from "./fields";
import { Checklist } from "./preview-panel";
import { CONDITION_LABEL, type CheckItem } from "./steps";
import type { StepProps } from "./types";

export interface SubmitIssue { step: number; message: string }

export interface ReviewExtras {
  card: PublicationCard;
  images: ImageDTO[];
  checklist: CheckItem[];
  terms: boolean;
  onTerms: (v: boolean) => void;
  termsError: boolean;
  submitIssues: SubmitIssue[];
  /** DRAFT/REJECTED se envían a revisión; el resto solo se edita. */
  canSubmit: boolean;
}

function EditLink({ step, go, label = "Editar" }: { step: number; go: (n: number) => void; label?: string }) {
  return (
    <button type="button" onClick={() => go(step)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-brand-700 transition hover:bg-brand-50">
      <Pencil className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Mosaic({ images, title }: { images: ImageDTO[]; title: string }) {
  const n = images.length;
  const tile = (im: ImageDTO | undefined, i: number, cls: string, extra?: React.ReactNode) => (
    <div key={im?.id ?? `f${i}`} className={cn("relative overflow-hidden bg-surface-2", cls)}>
      <Photo src={im?.url} alt={im ? `${title} — foto ${i + 1}` : ""} seed={i + 3} className="h-full w-full" sizes="(min-width:1024px) 40vw, 90vw" />
      {extra}
    </div>
  );
  if (n <= 1) return <div className="aspect-[16/9] overflow-hidden rounded-[24px]">{tile(images[0], 0, "h-full w-full")}</div>;
  if (n < 5) return <div className="grid aspect-[16/9] grid-cols-3 gap-2 overflow-hidden rounded-[24px]">{tile(images[0], 0, "col-span-2 row-span-full")}<div className="grid gap-2">{images.slice(1, 3).map((im, i) => tile(im, i + 1, ""))}</div></div>;
  return (
    <div className="grid aspect-[16/9] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[24px]">
      {tile(images[0], 0, "col-span-2 row-span-2")}
      {images.slice(1, 5).map((im, i) => tile(im, i + 1, "", i === 3 && n > 5 ? <span className="absolute inset-0 grid place-items-center bg-ink/55 text-lg font-semibold text-white">+{n - 5}</span> : null))}
    </div>
  );
}

export function StepReview({ draft, catalog, user, go, type, city, card, images, checklist, terms, onTerms, termsError, submitIssues, canSubmit }: StepProps & ReviewExtras) {
  const [view, setView] = useState<"ficha" | "tarjeta">("ficha");
  const hood = city?.neighborhoods.find((n) => n.id === draft.neighborhoodId);
  const amen = catalog.amenities.filter((a) => draft.amenityIds.includes(a.id));
  const rent = draft.operation === "RENT";
  const where = [hood?.name, city?.name].filter(Boolean).join(", ");
  const missing = checklist.filter((c) => c.required && !c.ok);
  const facts: { icon: string; label: string; value: string }[] = [
    draft.bedrooms != null ? { icon: "bed", label: "Habitaciones", value: String(draft.bedrooms) } : null,
    draft.bathrooms != null ? { icon: "bath", label: "Baños", value: String(draft.bathrooms) } : null,
    draft.parking ? { icon: "car", label: "Parqueaderos", value: String(draft.parking) } : null,
    draft.area ? { icon: "area", label: "Área", value: `${formatNumber(draft.area)} m²` } : null,
    draft.landArea ? { icon: "land", label: "Lote", value: `${formatNumber(draft.landArea)} m²` } : null,
    draft.stratum ? { icon: "layers", label: "Estrato", value: String(draft.stratum) } : null,
    draft.floor != null ? { icon: "stairs", label: "Piso", value: draft.totalFloors ? `${draft.floor} de ${draft.totalFloors}` : String(draft.floor) } : null,
    draft.ageYears != null ? { icon: "key", label: "Antigüedad", value: draft.ageYears === 0 ? "A estrenar" : `${draft.ageYears} años` } : null,
    draft.furnished ? { icon: "furnished", label: "Amoblado", value: "Sí" } : null,
    draft.petFriendly ? { icon: "pets", label: "Mascotas", value: "Permitidas" } : null,
  ].filter((x): x is { icon: string; label: string; value: string } => !!x);

  return (
    <div className="grid gap-9">
      {/* Selector de vista */}
      <div role="tablist" aria-label="Tipo de vista previa" className="flex w-fit rounded-full bg-surface p-1">
        {([["ficha", "Ficha del inmueble"], ["tarjeta", "En los resultados"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={cn("h-10 rounded-full px-5 text-sm font-semibold transition", view === id ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink")}>{label}</button>
        ))}
      </div>

      {view === "tarjeta" ? (
        <div className="grid justify-items-center rounded-[28px] bg-surface p-6 sm:p-10">
          <div className="w-full max-w-[380px]"><PropertyCard item={card} preview className="pointer-events-none select-none" sizes="380px" /></div>
        </div>
      ) : (
        <article className="grid gap-7 rounded-[28px] border border-line bg-white p-4 shadow-[var(--shadow-card)] sm:p-6" aria-label="Vista previa de la ficha">
          <div className="relative">
            <Mosaic images={images} title={card.title} />
            <div className="absolute right-3 top-3"><span className="rounded-full bg-white/95 shadow"><EditLink step={6} go={go} label="Fotos" /></span></div>
          </div>

          <header className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{OPERATION_LABEL[draft.operation]}</Badge>
              {type && <Badge>{type.name}</Badge>}
              <Badge>{CONDITION_LABEL[draft.condition]}</Badge>
              {draft.negotiable && <Badge tone="warn">Negociable</Badge>}
              <span className="ml-auto"><EditLink step={2} go={go} /></span>
            </div>
            <h2 className="display-md">{draft.title.trim() || <span className="text-ink-3">Tu título aparecerá aquí</span>}</h2>
            <p className="flex items-center gap-2 text-[15px] text-ink-2"><MapPin className="h-4 w-4 shrink-0 text-brand-600" />{where || "Ubicación pendiente"}{!draft.hideAddress && draft.address ? ` · ${draft.address}` : ""}<EditLink step={3} go={go} /></p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-display text-[2.6rem] leading-none tabular">{draft.price > 0 ? formatPrice(draft.price, draft.currency) : "—"}{rent && draft.price > 0 && <span className="ml-1.5 font-sans text-base text-ink-3">/ mes</span>}</p>
              {draft.adminFee ? <p className="text-[14px] text-ink-3">+ {formatPrice(draft.adminFee)} administración</p> : null}
              <EditLink step={7} go={go} />
            </div>
          </header>

          {facts.length > 0 && (
            <section aria-label="Datos clave">
              <div className="mb-2 flex items-center justify-between"><h3 className="text-[17px] font-semibold">Datos clave</h3><EditLink step={4} go={go} /></div>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {facts.map((f) => (
                  <div key={f.label} className="flex items-center gap-3 rounded-[16px] bg-surface px-3.5 py-3">
                    <Icon name={f.icon} size={20} className="shrink-0 text-brand-600" />
                    <div className="min-w-0"><dt className="text-[12px] text-ink-3">{f.label}</dt><dd className="truncate text-[15px] font-semibold">{f.value}</dd></div>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section aria-label="Descripción">
            <div className="mb-2 flex items-center justify-between"><h3 className="text-[17px] font-semibold">Descripción</h3><EditLink step={8} go={go} /></div>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{draft.description.trim() || "Aquí aparecerá la descripción de tu inmueble."}</p>
          </section>

          {amen.length > 0 && (
            <section aria-label="Comodidades">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-[17px] font-semibold">Comodidades</h3><EditLink step={5} go={go} /></div>
              <ul className="flex flex-wrap gap-2">
                {amen.map((a) => <li key={a.id} className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-[14px]"><Icon name={a.icon} size={16} className="text-brand-600" />{a.name}</li>)}
              </ul>
            </section>
          )}

          <section aria-label="Contacto" className="rounded-[20px] bg-surface p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-semibold">Cómo te contactarán</h3><EditLink step={9} go={go} /></div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-ink shadow-sm"><MessageCircle className="h-4 w-4 text-brand-600" /> Enviar mensaje</span>
              <span className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-ink shadow-sm"><WhatsAppIcon size={16} className="text-brand-600" /> WhatsApp Jucaro</span>
              {(draft.videoUrl || draft.tourUrl) && <span className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-ink shadow-sm"><Eye className="h-4 w-4 text-brand-600" /> {draft.tourUrl ? "Tour virtual" : "Video"}</span>}
            </div>
          </section>
        </article>
      )}

      {/* Lista de verificación */}
      <section aria-labelledby="chk" className="rounded-[24px] border border-line bg-white p-5">
        <div className="mb-3 flex items-center gap-3">
          <span className={cn("grid h-9 w-9 place-items-center rounded-full", missing.length ? "bg-sun-soft text-sun-ink" : "bg-success-soft text-success")}>{missing.length ? <CircleAlert className="h-5 w-5" /> : <Check className="h-5 w-5" strokeWidth={3} />}</span>
          <div>
            <h3 id="chk" className="text-[17px] font-semibold">{missing.length ? "Faltan datos para publicar" : "Todo listo para publicar"}</h3>
            <p className="text-[13.5px] text-ink-3">{missing.length ? "Corrígelos y vuelve aquí; tus cambios se guardan solos." : "Tu aviso cumple lo necesario. Los puntos recomendados ayudan a destacar."}</p>
          </div>
        </div>
        <Checklist items={checklist} onGo={go} />
        {submitIssues.length > 0 && (
          <div className="mt-4 grid gap-2 rounded-2xl bg-danger-soft p-4" role="alert">
            <p className="text-[14px] font-semibold text-danger">Corrige esto antes de publicar:</p>
            <ul className="grid gap-1.5">
              {submitIssues.map((s, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-[14px] text-danger">
                  <span>{s.message}</span>
                  {s.step > 0 && <button type="button" onClick={() => go(s.step)} className="shrink-0 rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-danger shadow-sm hover:brightness-95">Corregir</button>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {canSubmit ? (
        <div className="grid gap-4">
          <div className={cn("rounded-[20px] border p-4 transition-colors", termsError ? "border-danger bg-danger-soft/50" : "border-line bg-surface")}>
            <Checkbox
              checked={terms} onChange={onTerms}
              label={<>Acepto los <Link href="/legal/terminos" target="_blank" className="font-semibold text-ink underline underline-offset-4">términos y condiciones</Link> y la <Link href="/legal/privacidad" target="_blank" className="font-semibold text-ink underline underline-offset-4">política de privacidad</Link>, y confirmo que la información de mi aviso es veraz.</>}
            />
            {termsError && <p role="alert" className="mt-2 pl-8 text-[13px] font-medium text-danger">Acepta los términos para publicar.</p>}
          </div>
          <Callout tone="info" icon={user.verified ? <Rocket className="h-[18px] w-[18px]" /> : <Clock className="h-[18px] w-[18px]" />}>
            {user.verified
              ? <>Tu cuenta está verificada: al enviar, tu aviso se publica de inmediato.</>
              : <>Revisamos cada aviso antes de publicarlo, normalmente en menos de 24 horas. Te avisaremos cuando esté en línea.</>}
          </Callout>
        </div>
      ) : (
        <Callout tone="info">Estás editando un aviso que ya está en el sistema. Tus cambios se guardan automáticamente; no necesitas volver a publicar.</Callout>
      )}
    </div>
  );
}
