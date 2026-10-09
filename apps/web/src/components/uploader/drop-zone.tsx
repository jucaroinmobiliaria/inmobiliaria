"use client";

import { PhotoFallback } from "@/components/ui/photo";
import { Camera, ImagePlus } from "./icons";
import { cn } from "@/lib/cn";

/** Zona de carga grande (estado vacío). El área completa es un botón; la cámara es un segundo botón (solo táctil). */
export function DropZone({ onPick, onCamera, touch, max }: { onPick: () => void; onCamera: () => void; touch: boolean; max: number }) {
  return (
    <div className="group/drop relative overflow-hidden rounded-[28px] border-2 border-dashed border-line-strong bg-surface px-6 py-10 text-center transition-colors duration-300 focus-within:border-brand-600 hover:border-brand-600 hover:bg-brand-50/60 sm:py-14">
      <button
        type="button" onClick={onPick}
        aria-label={touch ? "Agregar fotos. Presiona para elegirlas de tu galería." : "Agregar fotos. Arrastra tus fotos aquí o presiona para elegirlas de tu dispositivo."}
        className="absolute inset-0 z-0 h-full w-full rounded-[26px] outline-none focus-visible:ring-4 focus-visible:ring-brand-600/25"
      />
      <div className="pointer-events-none relative z-[1] grid justify-items-center">
        {/* Postales apiladas */}
        <div className="relative mb-7 h-[104px] w-[220px]" aria-hidden>
          {[
            { seed: 2, cls: "-rotate-[9deg] -translate-x-[78px] group-hover/drop:-translate-x-[92px] group-hover/drop:-rotate-[12deg]", z: "z-0" },
            { seed: 1, cls: "rotate-[8deg] translate-x-[78px] group-hover/drop:translate-x-[92px] group-hover/drop:rotate-[12deg]", z: "z-0" },
            { seed: 0, cls: "-translate-y-1.5 group-hover/drop:-translate-y-3", z: "z-10" },
          ].map((c) => (
            <div key={c.seed} className={cn("absolute left-1/2 top-0 h-[96px] w-[128px] -ml-16 overflow-hidden rounded-2xl border-4 border-white shadow-[var(--shadow-card)] transition-all duration-500 ease-[var(--ease-out-expo)]", c.cls, c.z)}>
              <PhotoFallback seed={c.seed} />
            </div>
          ))}
          <span className="absolute -bottom-1 left-1/2 z-20 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-brand-600 text-white shadow-[0_8px_20px_-6px_rgb(11_107_87/0.8)] transition-transform duration-300 group-hover/drop:scale-110">
            <ImagePlus className="h-6 w-6" />
          </span>
        </div>
        <h3 className="font-display text-[1.85rem] leading-tight text-ink sm:text-[2.1rem]">{touch ? "Agrega tus fotos" : "Arrastra tus fotos aquí"}</h3>
        <p className="mt-2 max-w-md text-[15px] text-ink-2">{touch ? "Elígelas de tu galería o toma una foto. Puedes seleccionar varias a la vez." : "o elígelas desde tu computador. Puedes soltar varias a la vez, incluso una carpeta."}</p>
        <span className="mt-6 inline-flex h-14 items-center gap-2 rounded-full bg-brand-600 px-7 text-base font-semibold text-white shadow-[0_6px_18px_-6px_rgb(11_107_87/0.7)] transition-colors group-hover/drop:bg-brand-700">
          <ImagePlus className="h-5 w-5" /> Elegir fotos
        </span>
        <p className="mt-5 text-[13px] text-ink-3">JPG, PNG, WEBP, AVIF o HEIC · hasta {max} fotos · {touch ? "toma una foto ahora" : "también puedes pegarlas con Ctrl + V"}</p>
      </div>
      {touch && (
        <button
          type="button" onClick={onCamera}
          className="relative z-10 mx-auto mt-4 inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-white px-6 text-[15px] font-semibold text-ink transition hover:border-ink active:scale-[0.97]"
        >
          <Camera className="h-5 w-5" /> Tomar una foto
        </button>
      )}
    </div>
  );
}
