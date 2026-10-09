"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { Heart, Plus, Search, User, House } from "@/components/ui/icon";

/** Barra inferior móvil. Se oculta en el wizard, en el admin y en la ficha del inmueble (que trae su propia barra de contacto). */
export function TabBar() {
  const pathname = usePathname();
  const { user } = useSession();
  const seg = pathname.split("/").filter(Boolean);
  const isDetail = (seg[0] === "venta" || seg[0] === "arriendo") && /-\d+$/.test(seg[seg.length - 1] ?? "");
  if (pathname.startsWith("/publicar/") || pathname.startsWith("/admin") || isDetail || pathname.startsWith("/ingresar") || pathname.startsWith("/registro")) return null;

  const items = [
    { href: "/", label: "Inicio", icon: House, active: pathname === "/" },
    { href: "/venta", label: "Buscar", icon: Search, active: seg[0] === "venta" || seg[0] === "arriendo" },
    { href: "/publicar", label: "Publicar", icon: Plus, cta: true, active: pathname === "/publicar" },
    { href: "/favoritos", label: "Favoritos", icon: Heart, active: pathname === "/favoritos" },
    { href: user ? "/panel" : "/ingresar", label: user ? "Cuenta" : "Ingresar", icon: User, active: pathname.startsWith("/panel") },
  ];
  return (
    <nav aria-label="Navegación inferior" className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2">
        {items.map((i) => (
          <li key={i.label} className="flex justify-center">
            <Link href={i.href} className={cn("flex flex-col items-center gap-1 px-3 pb-1 text-[11px] font-semibold transition-colors", i.active ? "text-brand-700" : "text-ink-3")}>
              {i.cta ? <span className="-mt-5 grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-[0_8px_20px_-6px_rgb(11_107_87/0.8)]"><i.icon className="h-6 w-6" strokeWidth={2.2} /></span> : <i.icon className="h-[22px] w-[22px]" strokeWidth={i.active ? 2.2 : 1.8} />}
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
