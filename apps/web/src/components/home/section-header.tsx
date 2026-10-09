import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeader({ eyebrow, title, text, action, className, light }: { eyebrow?: string; title: ReactNode; text?: string; action?: ReactNode; className?: string; light?: boolean }) {
  return (
    <div className={cn("flex flex-col justify-between gap-5 md:flex-row md:items-end", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className={cn("eyebrow mb-3", light && "!text-brand-200")}>{eyebrow}</p>}
        <h2 className={cn("display-lg text-balance", light && "text-white")}>{title}</h2>
        {text && <p className={cn("mt-4 max-w-xl text-[17px] leading-relaxed", light ? "text-white/80" : "text-ink-2")}>{text}</p>}
      </div>
      {action}
    </div>
  );
}
