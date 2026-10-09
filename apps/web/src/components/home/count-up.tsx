"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";

const fmt = new Intl.NumberFormat("es-CO");

/** Número que cuenta hasta `value` al entrar en pantalla. */
export function CountUp({ value, duration = 1.6, className }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(value);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, value, duration]);
  return <span ref={ref} className={className} aria-label={fmt.format(value)}>{fmt.format(n)}</span>;
}
