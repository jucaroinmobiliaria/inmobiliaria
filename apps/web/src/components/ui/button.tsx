import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-brand-600 text-white shadow-[0_6px_18px_-6px_rgb(10_107_80/0.65)] hover:bg-brand-700 hover:shadow-[0_10px_24px_-8px_rgb(8_82_64/0.75)]",
  dark: "bg-ink text-white hover:bg-brand-900",
  sun: "bg-sun text-ink hover:brightness-95 shadow-[0_6px_18px_-8px_rgb(212_164_74/0.9)]",
  outline: "border border-line-strong bg-white text-ink hover:border-ink hover:bg-surface",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  ghost: "text-ink hover:bg-surface",
  danger: "bg-danger text-white hover:brightness-110",
  white: "bg-white text-ink hover:bg-surface shadow-[0_6px_20px_-8px_rgb(0_0_0/0.4)]",
} as const;

const sizes = {
  sm: "h-9 rounded-full px-4 text-sm",
  md: "h-11 rounded-full px-5 text-[15px]",
  lg: "h-14 rounded-full px-7 text-base",
  icon: "h-11 w-11 rounded-full",
  "icon-sm": "h-9 w-9 rounded-full",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

type Common = { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; className?: string; children?: ReactNode };
type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = Common & { href: string; prefetch?: boolean; target?: string; rel?: string; "aria-label"?: string; onClick?: () => void };

export const Button = forwardRef<HTMLButtonElement, AsButton | AsLink>(function Button(props, ref) {
  const { variant = "primary", size = "md", loading, className, children, type = "button", href, ...rest } = props as Common & { type?: "button" | "submit" | "reset"; href?: string } & Record<string, unknown>;
  const cls = cn(base, variants[variant], sizes[size], className);
  if (typeof href === "string" && href) {
    const a = rest as unknown as Omit<AsLink, "href">;
    return <Link href={href} className={cls} {...a}>{children}</Link>;
  }
  const b = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button ref={ref} type={type} className={cls} disabled={loading || b.disabled} {...b}>
      {loading && <span className="absolute inset-0 grid place-items-center"><Spinner /></span>}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-5 w-5 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-label="Cargando">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
