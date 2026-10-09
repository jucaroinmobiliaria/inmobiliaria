"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { InquiryRow, SessionUser } from "@/lib/types";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import {
  Bookmark, Calendar, LayoutDashboard, MessageCircle, Plus, Settings, ShieldCheck, ArrowUpRight,
  type LucideIcon,
} from "@/components/ui/icon";
import { Building2 } from "@/components/ui/icon";
import { useData } from "./common";

type NavItem = { href: string; label: string; short?: string; icon: LucideIcon; exact?: boolean; badge?: "messages" };

const NAV: NavItem[] = [
  { href: "/panel", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/panel/publicaciones", label: "Publicaciones", icon: Building2 },
  { href: "/panel/mensajes", label: "Mensajes", icon: MessageCircle, badge: "messages" },
  { href: "/panel/visitas", label: "Visitas", icon: Calendar },
  { href: "/panel/busquedas", label: "Búsquedas guardadas", short: "Búsquedas", icon: Bookmark },
  { href: "/panel/cuenta", label: "Cuenta", icon: Settings },
];

const ROLE_LABEL: Record<SessionUser["role"], string> = { USER: "Usuario", OWNER: "Propietario", AGENT: "Agente", ADMIN: "Administrador" };

function AdminEntry({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/admin"
      className={cn(
        "group relative inline-flex shrink-0 items-center gap-2.5 overflow-hidden bg-brand-800 font-semibold text-white shadow-[0_10px_24px_-12px_rgb(8_82_64/0.95)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-900 hover:shadow-[0_14px_28px_-12px_rgb(8_82_64/1)]",
        compact ? "h-10 gap-2 rounded-full px-4 text-sm" : "h-12 w-full rounded-full px-3.5 text-[15px]",
      )}
    >
      <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/20 opacity-0 transition duration-700 group-hover:left-full group-hover:opacity-100" />
      <span className={cn("relative grid shrink-0 place-items-center rounded-full bg-white/15", compact ? "h-6 w-6" : "h-8 w-8")}>
        <ShieldCheck className={compact ? "h-3.5 w-3.5" : "h-[18px] w-[18px]"} />
      </span>
      <span className="relative min-w-0 flex-1 truncate text-left">Administración</span>
      <ArrowUpRight className="relative h-4 w-4 shrink-0 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

export function PanelShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: inbox } = useData<InquiryRow[]>("/inquiries?scope=received", { refreshInterval: 30_000 });
  const unread = inbox?.filter((i) => i.unread).length ?? 0;
  const pills = useRef<HTMLDivElement>(null);

  const isActive = (n: NavItem) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(`${n.href}/`));

  useEffect(() => {
    const c = pills.current;
    const el = c?.querySelector<HTMLElement>('[aria-current="page"]');
    if (c && el) c.scrollTo({ left: el.offsetLeft - c.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [pathname]);

  return (
    <div className="container-x pb-28 pt-24 md:pb-16">
      <div className="lg:grid lg:grid-cols-[236px_minmax(0,1fr)] lg:gap-12">
        {/* Barra lateral (escritorio) */}
        <aside className="hidden lg:block" aria-label="Menú del panel">
          <div className="sticky top-24 grid gap-5">
            <div className="relative overflow-hidden rounded-[24px] bg-brand-900 p-4 text-white">
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sun/30 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <Avatar name={user.name} src={user.avatarUrl} size={44} />
                <div className="min-w-0">
                  <p className="truncate font-display text-[1.65rem] leading-none">{user.name.split(" ")[0]}</p>
                  <p className="mt-1 truncate text-xs text-white/70">{ROLE_LABEL[user.role]}{user.verified ? " · Verificado" : ""}</p>
                </div>
              </div>
              <p className="relative mt-4 text-[12.5px] leading-relaxed text-white/75">Tus avisos salen al público cuando un administrador los aprueba.</p>
            </div>
            <nav className="grid grid-cols-[minmax(0,1fr)] gap-1" aria-label="Panel">
              {NAV.map((n) => {
                const active = isActive(n);
                const count = n.badge === "messages" ? unread : 0;
                return (
                  <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                    className={cn("group flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-semibold transition-colors", active ? "bg-brand-50 text-brand-700" : "text-ink-2 hover:bg-surface hover:text-ink")}>
                    <n.icon className={cn("h-[19px] w-[19px] shrink-0", active ? "text-brand-600" : "text-ink-3 group-hover:text-ink")} strokeWidth={active ? 2.1 : 1.8} />
                    <span className="flex-1 truncate">{n.label}</span>
                    {count > 0 && <span aria-label={`${count} sin leer`} className="grid h-5 min-w-5 place-items-center rounded-full bg-heart px-1.5 text-[11px] font-bold text-white tabular">{count}</span>}
                  </Link>
                );
              })}
            </nav>
            <Button href="/publicar" className="w-full"><Plus className="h-[18px] w-[18px]" />Publicar inmueble</Button>
            {user.role === "ADMIN" && <AdminEntry />}
          </div>
        </aside>

        <div className="min-w-0">
          {/* Título y pestañas (móvil) */}
          <div className="sticky top-[68px] z-30 -mx-5 mb-5 border-b border-line bg-white/92 px-5 pb-3 pt-3 backdrop-blur md:-mx-8 md:px-8 lg:hidden">
            <div ref={pills} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="navigation" aria-label="Secciones del panel">
              {NAV.map((n) => {
                const active = isActive(n);
                const count = n.badge === "messages" ? unread : 0;
                return (
                  <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                    className={cn("inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors", active ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-white text-ink-2")}>
                    {n.short ?? n.label}
                    {count > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-heart px-1 text-[10px] font-bold text-white tabular">{count}</span>}
                  </Link>
                );
              })}
              {user.role === "ADMIN" && <AdminEntry compact />}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
