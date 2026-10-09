"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { subscribe, dismiss, type ToastItem } from "@/lib/toast";
import { CircleAlert, CircleCheck, Info, X } from "./icon";

/* ---------- Badge / Chip ---------- */
const tones = {
  neutral: "bg-surface-2 text-ink-2",
  success: "bg-success-soft text-success",
  warn: "bg-sun-soft text-sun-ink",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  brand: "bg-brand-50 text-brand-700",
  dark: "bg-ink text-white",
} as const;

export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none", tones[tone], className)}>{children}</span>;
}

export function Chip({ active, onClick, children, className, ...rest }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} {...rest}
      className={cn("inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-all active:scale-95",
        active ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-white text-ink hover:border-ink", className)}>
      {children}
    </button>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const [bad, setBad] = useState(false);
  if (src && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} onError={() => setBad(true)} className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />;
  }
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700", className)} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-label={name}>
      {initials(name)}
    </span>
  );
}

/* ---------- Skeleton / Empty ---------- */
export const Skeleton = ({ className }: { className?: string }) => <div className={cn("skeleton", className)} aria-hidden />;

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 rounded-[20px] border border-dashed border-line-strong px-6 py-14 text-center">
      {icon && <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">{icon}</div>}
      <h3 className="display-md !text-[1.6rem]">{title}</h3>
      {text && <p className="max-w-md text-[15px] text-ink-2">{text}</p>}
      {action}
    </div>
  );
}

/* ---------- Reveal on scroll ---------- */
export function Reveal({ children, delay = 0, y = 24, className, as = "div" }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const M = motion[as] as typeof motion.div;
  return (
    <M ref={ref} className={className} initial={{ opacity: 0, y }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </M>
  );
}

/* ---------- Dialog / Sheet ---------- */
export function Dialog({ open, onClose, children, title, size = "md", sheet = false, className }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; size?: "sm" | "md" | "lg" | "xl" | "full"; sheet?: boolean; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!mounted || !open) return null;
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl", full: "max-w-none h-dvh rounded-none" }[size];
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-ink/55 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: sheet ? 60 : 24, scale: sheet ? 1 : 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn("relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-white shadow-[var(--shadow-pop)] sm:rounded-[28px]", w, className)}>
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-6 py-4 backdrop-blur">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface"><X className="h-5 w-5" /></button>
          </div>
        )}
        {children}
      </motion.div>
    </div>,
    document.body,
  );
}

/* ---------- Toaster ---------- */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribe(setItems), []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[200] flex flex-col items-center gap-2 px-4 md:bottom-8" aria-live="polite">
      {items.map((t) => (
        <motion.div key={t.id} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-[var(--shadow-pop)]">
          {t.tone === "success" ? <CircleCheck className="h-5 w-5 shrink-0 text-brand-400" /> : t.tone === "error" ? <CircleAlert className="h-5 w-5 shrink-0 text-[#ff8f86]" /> : <Info className="h-5 w-5 shrink-0 text-sun" />}
          <span>{t.text}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="-mr-2 grid h-6 w-6 place-items-center rounded-full opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Tabs ligeros ---------- */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
      {items.map((i) => (
        <button key={i.value} role="tab" aria-selected={value === i.value} onClick={() => onChange(i.value)}
          className={cn("relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors", value === i.value ? "bg-ink text-white" : "text-ink-2 hover:bg-surface")}>
          {i.label}{i.count != null && <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-xs", value === i.value ? "bg-white/20" : "bg-surface-2")}>{i.count}</span>}
        </button>
      ))}
    </div>
  );
}
