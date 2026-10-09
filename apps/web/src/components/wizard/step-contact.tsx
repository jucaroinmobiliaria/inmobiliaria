"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Switch } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { CalendarDays, CircleCheck, ExternalLink, Link2, MessageCircle, Video } from "@/components/uploader/icons";
import { Callout, FieldBlock } from "./fields";
import { isHttpUrl } from "./steps";
import type { StepProps } from "./types";

/** Devuelve la URL embebible de YouTube o Vimeo (o null). */
export function embedFor(raw: string | null | undefined): { provider: "YouTube" | "Vimeo"; src: string } | null {
  if (!raw || !isHttpUrl(raw)) return null;
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^(www|m)\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/")[1];
      return id && /^[\w-]{11}$/.test(id) ? { provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      const id = v ?? m?.[1];
      return id && /^[\w-]{11}$/.test(id) ? { provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const m = u.pathname.match(/(?:video\/)?(\d{6,})/);
      return m ? { provider: "Vimeo", src: `https://player.vimeo.com/video/${m[1]}` } : null;
    }
  } catch { /* url inválida */ }
  return null;
}

function UrlField({ id, label, hint, value, onChange, error, placeholder }: { id: string; label: string; hint: string; value: string | null; onChange: (v: string | null) => void; error?: string; placeholder: string }) {
  const v = value ?? "";
  const bad = v.length > 0 && !isHttpUrl(v);
  const ok = v.length > 0 && !bad;
  return (
    <FieldBlock label={label} htmlFor={id} optional hint={bad ? undefined : hint} error={error ?? (bad ? "Escribe un enlace completo, por ejemplo https://…" : null)}>
      <div className="relative">
        <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <input
          id={id} type="url" inputMode="url" autoComplete="off" value={v} placeholder={placeholder} aria-invalid={bad || !!error}
          onChange={(e) => onChange(e.target.value.trim() || null)}
          className={cn("h-12 w-full rounded-[12px] border bg-white pl-11 pr-11 text-[15px] placeholder:text-ink-3 hover:border-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15", bad || error ? "border-danger" : "border-field/60")}
        />
        {ok && <CircleCheck className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-success" aria-label="Enlace válido" />}
      </div>
    </FieldBlock>
  );
}

export function StepContact({ draft, user, update, errors }: StepProps) {
  const phone = user.phone;
  const wa = user.profile.whatsapp ?? user.phone;
  const embed = useMemo(() => embedFor(draft.videoUrl), [draft.videoUrl]);
  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <div className="grid gap-5 rounded-[20px] border border-line bg-white p-4 sm:p-5">
          <Switch
            checked={draft.showPhone} onChange={(v) => update({ showPhone: v })}
            label="Mostrar mi teléfono" description={phone ? `Se verá ${phone} para quien quiera llamarte.` : "Quienes te vean podrán llamarte directamente."}
          />
          <div className="h-px bg-line" />
          <Switch
            checked={draft.showWhatsapp} onChange={(v) => update({ showWhatsapp: v })}
            label="Mostrar WhatsApp" description={wa ? `Botón para escribirte a ${wa}.` : "Botón para que te escriban por WhatsApp."}
          />
        </div>
        {(!phone && !user.profile.whatsapp) && (draft.showPhone || draft.showWhatsapp) && (
          <Callout tone="warn" className="mt-3">
            Aún no tienes teléfono ni WhatsApp en tu perfil, así que no habrá botones de contacto directo. <Link href="/panel/cuenta" className="font-semibold underline underline-offset-4">Agrégalos en tu cuenta</Link>. Los mensajes dentro de Jucaro siempre funcionan.
          </Callout>
        )}
        <p className="mt-3 flex items-start gap-2 text-[13.5px] text-ink-3"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0" /> Los mensajes de los interesados llegan siempre a tu panel y a tu correo, aunque ocultes el teléfono.</p>
      </div>

      <div className="grid gap-5">
        <UrlField id="video" label="Video" value={draft.videoUrl} onChange={(v) => update({ videoUrl: v })} error={errors.videoUrl} placeholder="https://www.youtube.com/watch?v=…" hint="Enlace de YouTube o Vimeo. Un recorrido corto de 1 a 2 minutos funciona muy bien." />
        {draft.videoUrl && isHttpUrl(draft.videoUrl) && (
          embed ? (
            <div className="overflow-hidden rounded-[24px] border border-line bg-surface">
              <div className="relative aspect-video w-full">
                <div className="absolute inset-0 grid place-items-center text-ink-3"><Video className="h-8 w-8" aria-hidden /></div>
                <iframe
                  key={embed.src} src={embed.src} title={`Vista previa del video (${embed.provider})`} loading="lazy" className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
              <p className="border-t border-line bg-white px-4 py-2.5 text-[13px] text-ink-3">Vista previa de {embed.provider}. Así se verá en tu aviso.</p>
            </div>
          ) : (
            <Callout tone="warn">No reconocimos el enlace como YouTube o Vimeo, así que no podemos mostrar una vista previa. Se guardará igual como enlace.</Callout>
          )
        )}

        <UrlField id="tour" label="Tour virtual" value={draft.tourUrl} onChange={(v) => update({ tourUrl: v })} error={errors.tourUrl} placeholder="https://my.matterport.com/show/?m=…" hint="Enlace a un recorrido 360° (Matterport, Kuula, etc.)." />
        {draft.tourUrl && isHttpUrl(draft.tourUrl) && (
          <a href={draft.tourUrl} target="_blank" rel="noopener noreferrer nofollow" className="-mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-line-strong bg-white px-4 py-2 text-[14px] font-semibold text-ink transition hover:border-ink">
            Probar el enlace <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="flex items-start gap-4 rounded-[24px] bg-surface p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-sm"><CalendarDays className="h-5 w-5" /></span>
        <div>
          <p className="text-[15px] font-semibold text-ink">Visitas</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-2">Quienes se interesen podrán pedirte una visita desde tu aviso, eligiendo fecha y hora. Verás las solicitudes en tu panel y podrás confirmarlas o cancelarlas.</p>
        </div>
      </div>
    </div>
  );
}
