"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { api, ApiException } from "@/lib/api";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import type { DraftDTO, Operation } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/button";
import { ArrowRight } from "@/components/uploader/icons";

const OPTIONS: { op: Operation; title: string; text: string; icon: string }[] = [
  { op: "SALE", title: "Quiero vender", text: "Publica tu inmueble en venta", icon: "handshake" },
  { op: "RENT", title: "Quiero arrendar", text: "Publícalo en arriendo", icon: "key" },
];

/** Primer toque: elegir Venta o Arriendo crea el borrador y lleva directo al asistente. */
export function StartPublishing({ className, id = "empezar" }: { className?: string; id?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Operation | null>(null);

  const start = async (op: Operation) => {
    if (busy) return;
    setBusy(op);
    try {
      const d = await api<DraftDTO>("/publications", { body: { operation: op } });
      router.push(`/publicar/${d.id}`);
    } catch (e) {
      setBusy(null);
      toast.error(e instanceof ApiException ? e.message : "No pudimos crear tu borrador. Inténtalo de nuevo.");
    }
  };

  return (
    <div id={id} className={cn("rounded-[28px] border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-6", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[19px] font-semibold text-ink">Empezar a publicar</h2>
        <p className="hidden text-[13px] text-ink-3 sm:block">Toma unos 8 minutos</p>
      </div>
      <div className="grid gap-3">
        {OPTIONS.map((o) => (
          <motion.button
            key={o.op} type="button" onClick={() => void start(o.op)} disabled={!!busy} whileTap={{ scale: 0.98 }}
            aria-busy={busy === o.op}
            className={cn(
              "group relative flex items-center gap-4 rounded-[20px] border-2 p-4 text-left transition-all duration-300 ease-[var(--ease-out-expo)] disabled:cursor-wait",
              busy === o.op ? "border-brand-600 bg-brand-50" : "border-line hover:border-brand-600 hover:bg-brand-50/50 hover:shadow-[var(--shadow-card)]", busy && busy !== o.op && "opacity-50",
            )}
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white"><Icon name={o.icon} size={26} /></span>
            <span className="grid min-w-0 gap-0.5">
              <span className="font-display text-[1.65rem] leading-none text-ink">{o.title}</span>
              <span className="text-[13.5px] text-ink-2">{o.text}</span>
            </span>
            <span className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-300 group-hover:translate-x-0.5">
              {busy === o.op ? <Spinner className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
            </span>
          </motion.button>
        ))}
      </div>
      <p className="mt-4 text-center text-[13px] text-ink-3">Gratis · Tu borrador se guarda solo y puedes retomarlo cuando quieras.</p>
    </div>
  );
}
