"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { useFavorites } from "@/lib/favorites";
import { Heart } from "@/components/ui/icon";
import { burst } from "@/components/motion/gestures";

/** Corazón con rebote. `variant="glass"` para sobre fotos, `"plain"` para fondo blanco. */
export function FavoriteButton({ id, variant = "glass", className, label }: { id: string; variant?: "glass" | "plain"; className?: string; label?: boolean }) {
  const { isFavorite, toggle } = useFavorites();
  const on = isFavorite(id);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={on}
      aria-label={on ? "Quitar de favoritos" : "Guardar en favoritos"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); burst("heart", e.currentTarget); void toggle(id); }}
      className={cn(
        "relative z-20 inline-flex items-center justify-center gap-2 rounded-full transition-all duration-200 active:scale-90",
        variant === "glass" ? "h-10 w-10 bg-white/85 text-ink shadow-[0_4px_14px_rgb(0_0_0/0.18)] backdrop-blur hover:bg-white" : "h-11 border border-line-strong px-4 text-sm font-semibold hover:border-ink",
        className,
      )}
    >
      <Heart key={String(on)} className={cn("h-5 w-5 transition-colors", on ? "animate-pop fill-heart text-heart" : "")} strokeWidth={on ? 0 : 1.9} fill={on ? "currentColor" : "none"} />
      {label && <span>{on ? "Guardado" : "Guardar"}</span>}
    </button>
  );
}
