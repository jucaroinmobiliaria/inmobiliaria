import { cn } from "@/lib/cn";

/** Anillo de progreso circular con role=progressbar. `value` 0..1; sin `value` = indeterminado. */
export function ProgressRing({ value, size = 52, label, className, showValue = true, tone = "light" }: {
  value?: number; size?: number; label: string; className?: string; showValue?: boolean; tone?: "light" | "dark";
}) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const indeterminate = value === undefined;
  const v = Math.max(0, Math.min(1, value ?? 0.28));
  const track = tone === "light" ? "rgba(255,255,255,0.32)" : "rgba(14,21,18,0.12)";
  const bar = tone === "light" ? "#fff" : "var(--color-brand-600)";
  return (
    <svg
      role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(v * 100)}
      viewBox="0 0 40 40" width={size} height={size} className={cn(indeterminate && "animate-spin", className)}
    >
      <circle cx="20" cy="20" r={r} fill="none" stroke={track} strokeWidth="3" />
      <circle
        cx="20" cy="20" r={r} fill="none" stroke={bar} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={`${c * v} ${c}`} transform={indeterminate ? undefined : "rotate(-90 20 20)"}
        style={{ transition: indeterminate ? undefined : "stroke-dasharray 180ms linear" }}
      />
      {showValue && !indeterminate && (
        <text x="20" y="23.4" textAnchor="middle" fontSize="9.5" fontWeight="600" fill={tone === "light" ? "#fff" : "currentColor"}>{Math.round(v * 100)}</text>
      )}
    </svg>
  );
}
