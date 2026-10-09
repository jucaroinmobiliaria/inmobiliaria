"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api, ApiException } from "@/lib/api";
import { formatPriceShort, timeAgo } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { MyPublicationRow } from "@/lib/types";
import { Photo } from "@/components/ui/photo";
import { ArrowRight, Trash2 } from "@/components/uploader/icons";

const fallbackTitle = (r: MyPublicationRow) => `${r.type ?? "Inmueble"} en ${r.operation === "SALE" ? "venta" : "arriendo"}${r.city ? ` · ${r.city}` : ""}`;

/** Borradores sin terminar: porcentaje, última edición, continuar y eliminar (con confirmación). */
export function DraftList({ rows }: { rows: MyPublicationRow[] }) {
  const router = useRouter();
  const [gone, setGone] = useState<string[]>([]);
  const [ask, setAsk] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await api(`/publications/${id}`, { method: "DELETE" });
      setGone((g) => [...g, id]);
      setAsk(null);
      toast.success("Borrador eliminado");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiException ? e.message : "No pudimos eliminar el borrador.");
    } finally {
      setBusy(null);
    }
  };

  const list = rows.filter((r) => !gone.includes(r.id));
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence initial={false}>
        {list.map((r) => {
          const pct = Math.max(0, Math.min(100, Math.round(r.completion)));
          const title = r.title.trim() || fallbackTitle(r);
          return (
            <motion.li
              key={r.id} layout exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.25 }}
              className="group relative overflow-hidden rounded-[24px] border border-line bg-white transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
            >
              <Link href={`/publicar/${r.id}`} className="block" aria-label={`Continuar: ${title}. ${pct}% completo`}>
                <div className="relative aspect-[16/10]">
                  <Photo src={r.coverUrl} alt="" seed={r.code} className="absolute inset-0" sizes="(min-width:1024px) 30vw, 90vw" />
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-ink shadow-sm">{r.operation === "SALE" ? "Venta" : "Arriendo"}</span>
                  {!r.coverUrl && <span className="absolute inset-x-0 bottom-3 text-center text-[12.5px] font-medium text-ink/70">Aún sin fotos</span>}
                </div>
                <div className="grid gap-3 p-5">
                  <div className="min-w-0">
                    <p className="line-clamp-2 min-h-[2.8em] text-[16px] font-semibold leading-snug text-ink">{title}</p>
                    <p className="mt-1 text-[13px] text-ink-3">
                      {r.price > 0 ? <>{formatPriceShort(r.price, r.currency)} · </> : null}Editado {timeAgo(r.updatedAt)}
                    </p>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-ink-2">{pct}% completo</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-brand-700 transition-transform group-hover:translate-x-0.5">Continuar <ArrowRight className="h-4 w-4" /></span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del borrador">
                      <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
              <div className="absolute right-3 top-3 flex items-center gap-1.5">
                {ask === r.id ? (
                  <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-md">
                    <button type="button" onClick={() => void remove(r.id)} disabled={busy === r.id} className="h-8 rounded-full bg-danger px-3 text-[12.5px] font-semibold text-white disabled:opacity-60">{busy === r.id ? "Eliminando…" : "Sí, eliminar"}</button>
                    <button type="button" onClick={() => setAsk(null)} className="h-8 rounded-full px-3 text-[12.5px] font-semibold text-ink-2 hover:bg-surface">Cancelar</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setAsk(r.id)} aria-label={`Eliminar borrador: ${title}`} className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-ink-2 shadow-sm transition hover:bg-white hover:text-danger focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
