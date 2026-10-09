import Link from "next/link";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/cn";

/** Isotipo del logo: placa verde con el monograma y la casita de latón. */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/brand/mark.png" alt="" width={317} height={313} className={cn("h-10 w-10 object-contain", className)} />;
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name} — inicio`}
      className={cn(
        "inline-flex items-center rounded-2xl transition-transform duration-300 ease-out hover:scale-[1.03]",
        light && "bg-white/95 px-3 py-1.5 shadow-[0_10px_24px_-14px_rgb(0_0_0/0.7)]",
        className,
      )}
    >
      <img src="/brand/logo.png" alt="" width={925} height={313} className="h-10 w-auto sm:h-11" />
    </Link>
  );
}
