"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check } from "@/components/uploader/icons";

const COLORS = ["#0b6b57", "#2fa88c", "#f2b544", "#b2ddd0", "#084f40", "#ffd98a"];
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Confeti ligero (solo transform/opacity) + sello de éxito. Valores deterministas: no hay diferencias de hidratación. */
export function SuccessCelebration() {
  const reduce = useReducedMotion();
  const pieces = Array.from({ length: 44 }, (_, i) => i);
  return (
    <div className="relative mx-auto grid h-28 w-28 place-items-center" aria-hidden>
      {!reduce && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
          {pieces.map((i) => {
            const angle = rnd(i, 1) * Math.PI * 2;
            const dist = 110 + rnd(i, 2) * 190;
            const w = 6 + Math.round(rnd(i, 3) * 6);
            return (
              <motion.span
                key={i}
                className="absolute block"
                style={{ width: w, height: i % 3 === 0 ? w : w * 2.2, background: COLORS[i % COLORS.length], borderRadius: i % 3 === 0 ? 999 : 2, left: -w / 2, top: -w }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
                animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.7 + 90 * rnd(i, 4), opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.8], rotate: (rnd(i, 5) - 0.5) * 720 }}
                transition={{ duration: 1.7 + rnd(i, 6) * 0.9, delay: 0.25 + rnd(i, 7) * 0.2, ease: [0.16, 1, 0.3, 1], times: [0, 0.12, 0.7, 1] }}
              />
            );
          })}
        </div>
      )}
      <motion.span
        className="relative grid h-24 w-24 place-items-center rounded-full bg-brand-600 text-white shadow-[0_18px_40px_-12px_rgb(11_107_87/0.7)]"
        initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
      >
        <motion.span initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} className="absolute inset-0 rounded-full ring-8 ring-brand-600/15" />
        <Check className="h-11 w-11" strokeWidth={3} />
      </motion.span>
    </div>
  );
}
