"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Share2 } from "@/components/ui/icon";

export function ShareButton({ title, text }: { title: string; text: string }) {
  const share = async () => {
    const url = window.location.origin + window.location.pathname;
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title, text, url }); } catch { /* cancelado */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); toast.success("Enlace copiado al portapapeles"); } catch { toast.info(url); }
  };
  return (
    <button type="button" onClick={() => void share()} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold transition hover:border-ink active:scale-95">
      <Share2 className="h-[18px] w-[18px]" />Compartir
    </button>
  );
}

/** Cuenta una visita por sesión de navegador. */
export function ViewTracker({ id }: { id: string }) {
  useEffect(() => {
    const k = `nido:viewed:${id}`;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch { /* noop */ }
    void api(`/publications/${id}/view`, { method: "POST" }).catch(() => null);
  }, [id]);
  return null;
}

export function ReadMore({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 420;
  return (
    <div>
      <p className={`whitespace-pre-line text-[17px] leading-[1.75] text-ink-2 ${className ?? ""} ${!open && long ? "line-clamp-6" : ""}`}>{text}</p>
      {long && <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-3 text-[15px] font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800">{open ? "Leer menos" : "Leer más"}</button>}
    </div>
  );
}
