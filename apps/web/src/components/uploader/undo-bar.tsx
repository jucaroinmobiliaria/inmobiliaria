"use client";

import { AnimatePresence, motion } from "motion/react";
import { Trash2, Undo2 } from "./icons";
import type { UndoEntry } from "./types";

/** Aviso "Foto eliminada · Deshacer": el DELETE solo se envía cuando termina la cuenta regresiva. */
export function UndoBar({ undo, onUndo }: { undo: UndoEntry | null; onUndo: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-[140] flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {undo && (
          <motion.div
            key={undo.id}
            initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-full bg-ink py-2 pl-5 pr-2 text-sm font-medium text-white shadow-[var(--shadow-pop)]"
          >
            <Trash2 className="h-4 w-4 shrink-0 opacity-80" />
            <span>{undo.label}</span>
            <button type="button" onClick={() => onUndo(undo.id)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-4 font-semibold transition hover:bg-white/25 active:scale-95">
              <Undo2 className="h-4 w-4" /> Deshacer
            </button>
            <motion.span className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-sun" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 6, ease: "linear" }} aria-hidden />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
