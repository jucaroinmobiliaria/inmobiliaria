"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";
import { useSession } from "@/lib/session";
import type { AdminOverview, SessionUser } from "@/lib/types";
import { Avatar } from "@/components/ui/misc";
import { LogoMark } from "@/components/layout/logo";
import {
  ArrowLeft, ArrowUpRight, Building2, ChartColumn, ChevronLeft, ChevronRight, Database, Flag, LayoutDashboard, ListChecks, LogOut, Menu, Search, ScrollText, Users, X, House, User as UserIcon,
  type LucideIcon,
} from "@/components/ui/icon";
import { ActionMenu, useData } from "@/components/panel/common";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: "pending" | "reports" };
const GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "General", items: [
    { href: "/admin", label: "Resumen", icon: ChartColumn, exact: true },
    { href: "/admin/moderacion", label: "Moderación", icon: ListChecks, badge: "pending" },
    { href: "/admin/publicaciones", label: "Publicaciones", icon: Building2 },
  ] },
  { title: "Comunidad", items: [
    { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    { href: "/admin/reportes", label: "Reportes", icon: Flag, badge: "reports" },
  ] },
  { title: "Sistema", items: [
    { href: "/admin/catalogos", label: "Catálogos", icon: Database },
    { href: "/admin/auditoria", label: "Auditoría", icon: ScrollText },
  ] },
];

export function useAdminCounts() {
  const { data } = useData<AdminOverview>("/admin/overview", { refreshInterval: 30_000 });
  return { pending: data?.pendingReview ?? 0, reports: data?.openReports ?? 0 };
}

function NavLinks({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const pathname = usePathname();
  const { pending, reports } = useAdminCounts();
  return (
    <nav aria-label="Administración" className={cn("grid grid-cols-[minmax(0,1fr)]", compact ? "gap-2" : "gap-5")}>
      {GROUPS.map((g, gi) => (
        <div key={g.title} className={cn(compact && gi > 0 && "border-t border-line pt-2")}>
          <p className={cn("mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3", compact && "sr-only")}>{g.title}</p>
          <ul className="grid gap-0.5">
            {g.items.map((n) => {
              const active = n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(`${n.href}/`);
              const count = n.badge === "pending" ? pending : n.badge === "reports" ? reports : 0;
              return (
                <li key={n.href}>
                  <Link href={n.href} onClick={onNavigate} aria-current={active ? "page" : undefined} title={compact ? n.label : undefined}
                    className={cn("flex h-10 items-center rounded-xl text-sm font-semibold transition-colors", compact ? "justify-center px-0" : "gap-3 px-3", active ? "bg-brand-50 text-brand-800" : "text-ink-2 hover:bg-surface hover:text-ink")}>
                    <span className="relative shrink-0">
                      <n.icon className={cn("h-[18px] w-[18px]", active ? "text-brand-600" : "text-ink-3")} strokeWidth={active ? 2.1 : 1.8} />
                      {compact && count > 0 && <span className={cn("absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full", n.badge === "pending" ? "bg-brand-700" : "bg-heart")} />}
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate", compact && "sr-only")}>{n.label}</span>
                    {!compact && count > 0 && <span aria-label={`${count} pendientes`} className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular", n.badge === "pending" ? "bg-brand-700 text-white" : "bg-heart text-white")}>{count}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function BackActions({ onBack, compact = false }: { onBack: () => void; compact?: boolean }) {
  const item = compact ? "grid h-10 w-10 place-items-center rounded-xl" : "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold";
  return (
    <div className={cn("grid gap-1.5", compact && "justify-items-center")}>
      <button type="button" onClick={onBack} title={compact ? "Atrás" : undefined} className={cn(item, "bg-ink text-white transition hover:bg-brand-900")}>
        <ArrowLeft className="h-[18px] w-[18px]" /><span className={cn(!compact && "font-semibold", compact && "sr-only")}>Atrás</span>
      </button>
      <Link href="/panel" title={compact ? "Mi panel" : undefined} className={cn(item, "border border-line-strong bg-white transition hover:border-ink")}>
        <LayoutDashboard className="h-[18px] w-[18px] text-ink-3" /><span className={cn(compact && "sr-only")}>Mi panel</span>
      </Link>
      <Link href="/" title={compact ? "Volver al sitio" : undefined} className={cn(item, "border border-brand-200 bg-brand-50 text-brand-800 transition hover:border-brand-600")}>
        <House className="h-[18px] w-[18px]" /><span className={cn("min-w-0 flex-1 truncate", compact && "sr-only")}>Volver al sitio</span>{!compact && <ArrowUpRight className="h-4 w-4 shrink-0" />}
      </Link>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/admin" aria-label={`${SITE.name} — administración`} className={cn("flex min-w-0 items-center", compact ? "justify-center" : "gap-2.5")}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className={cn("truncate font-display text-[1.45rem] leading-none tracking-tight", compact && "sr-only")}>{SITE.name}</span>
      <span className={cn("shrink-0 rounded-md bg-brand-900 px-1.5 py-1 text-[10px] font-bold uppercase leading-none tracking-wider text-white", compact && "sr-only")}>Admin</span>
    </Link>
  );
}

const NAV_KEY = "jucaro-admin-nav";

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useSession();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [hi, setHi] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const searchWrap = useRef<HTMLDivElement>(null);

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => { setCollapsed(localStorage.getItem(NAV_KEY) === "compact"); }, []);
  const toggleNav = () => setCollapsed((v) => {
    const next = !v;
    localStorage.setItem(NAV_KEY, next ? "compact" : "full");
    return next;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && t && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) { e.preventDefault(); input.current?.focus(); }
    };
    const onDown = (e: MouseEvent) => { if (searchWrap.current && !searchWrap.current.contains(e.target as Node)) setFocus(false); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, []);

  const targets = [
    { label: "Publicaciones", href: (s: string) => `/admin/publicaciones?q=${encodeURIComponent(s)}`, icon: Building2 },
    { label: "Usuarios", href: (s: string) => `/admin/usuarios?q=${encodeURIComponent(s)}`, icon: UserIcon },
  ];
  const goBack = () => {
    const ref = document.referrer;
    let sameOrigin = false;
    try { sameOrigin = !!ref && new URL(ref).origin === window.location.origin; } catch { sameOrigin = false; }
    if (sameOrigin && window.history.length > 1) {
      router.back();
      return;
    }
    if (pathname !== "/admin") router.push("/admin");
    else router.push("/panel");
  };

  const go = (i: number) => {
    const s = q.trim();
    if (!s) return;
    router.push(targets[i]!.href(s));
    setFocus(false);
    input.current?.blur();
  };

  return (
    <>
      {/* El pie de página global no aplica al admin: este shell tiene su propio chrome. */}
      <style>{`body > footer { display: none; }`}</style>
      <div className={cn("min-h-dvh bg-white lg:grid lg:transition-[grid-template-columns] lg:duration-300 lg:ease-[cubic-bezier(0.16,1,0.3,1)]", collapsed ? "lg:grid-cols-[76px_minmax(0,1fr)]" : "lg:grid-cols-[232px_minmax(0,1fr)]")}>
        <aside id="admin-nav" className={cn("sticky top-0 hidden h-dvh w-full flex-col overflow-x-hidden overflow-y-auto border-r border-line bg-white lg:flex", collapsed ? "gap-4 px-2 py-4" : "gap-5 px-3 py-4")} aria-label="Barra lateral">
          <div className={cn("grid gap-2", collapsed ? "justify-items-center" : "px-1")}>
            <Brand compact={collapsed} />
            <button type="button" onClick={toggleNav} aria-expanded={!collapsed} aria-controls="admin-nav" className={cn("flex h-10 items-center rounded-xl border border-line-strong text-sm font-semibold text-ink-2 transition hover:border-ink hover:bg-surface", collapsed ? "w-10 justify-center" : "gap-2 px-3")}>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span className={cn(collapsed && "sr-only")}>{collapsed ? "Ampliar menú" : "Reducir menú"}</span>
            </button>
          </div>
          <NavLinks compact={collapsed} />
          <div className="mt-auto grid gap-2">
            <BackActions onBack={goBack} compact={collapsed} />
            <div className={cn("flex items-center rounded-xl bg-surface", collapsed ? "justify-center p-1.5" : "gap-3 px-3 py-2.5")} title={collapsed ? user.name : undefined}>
              <Avatar name={user.name} src={user.avatarUrl} size={collapsed ? 32 : 34} />
              <div className={cn("min-w-0", collapsed && "sr-only")}><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-ink-3">Administrador</p></div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur md:px-8">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Abrir menú de administración" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-surface lg:hidden"><Menu className="h-6 w-6" /></button>
            <Link href="/admin" className="shrink-0 lg:hidden" aria-label="Resumen de administración"><LogoMark className="h-8 w-8 text-brand-700" /></Link>

            <div ref={searchWrap} className="relative min-w-0 max-w-xl flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3" />
              <input ref={input} type="search" role="combobox" aria-expanded={focus && !!q.trim()} aria-controls="admin-search-list" aria-autocomplete="list" aria-label="Buscar en administración"
                value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }} onFocus={() => setFocus(true)} placeholder="Buscar publicaciones o usuarios…"
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => (h + 1) % targets.length); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h - 1 + targets.length) % targets.length); }
                  else if (e.key === "Enter") { e.preventDefault(); go(hi); }
                  else if (e.key === "Escape") { setFocus(false); input.current?.blur(); }
                }}
                className="h-10 w-full rounded-full border border-line bg-surface pl-10 pr-10 text-sm placeholder:text-ink-3 hover:border-line-strong focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-600/15 [&::-webkit-search-cancel-button]:hidden" />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-3 sm:block">/</kbd>
              {focus && q.trim() && (
                <ul id="admin-search-list" role="listbox" className="absolute inset-x-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-pop)]">
                  {targets.map((t, i) => (
                    <li key={t.label} role="option" aria-selected={hi === i}>
                      <button type="button" onMouseEnter={() => setHi(i)} onClick={() => go(i)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm", hi === i ? "bg-surface" : "")}>
                        <t.icon className="h-[18px] w-[18px] text-ink-3" />Buscar «<strong className="max-w-[10rem] truncate">{q.trim()}</strong>» en {t.label.toLowerCase()}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={goBack} aria-label="Atrás" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 text-sm font-semibold text-white transition hover:bg-brand-900 sm:px-3.5">
                <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Atrás</span>
              </button>
              <Link href="/panel" className="hidden h-10 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-sm font-semibold hover:border-ink sm:inline-flex">Mi panel</Link>
              <Link href="/" className="hidden h-10 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 text-sm font-semibold text-brand-800 hover:border-brand-600 md:inline-flex">Sitio<ArrowUpRight className="h-4 w-4" /></Link>
              <ActionMenu label="Menú de usuario" className="rounded-full" trigger={<span className="flex items-center gap-2 rounded-full border border-line-strong p-1 pr-3 transition hover:border-ink"><Avatar name={user.name} src={user.avatarUrl} size={30} /><span className="hidden max-w-[110px] truncate text-sm font-semibold sm:block">{user.name.split(" ")[0]}</span></span>}
                items={[
                  { label: "Atrás", icon: <ArrowLeft />, onSelect: goBack },
                  { label: "Mi panel", icon: <LayoutDashboard />, href: "/panel" },
                  { label: "Volver al sitio", icon: <House />, href: "/" },
                  { label: "Cerrar sesión", icon: <LogOut />, separatorBefore: true, onSelect: () => void logout() },
                ]} />
            </div>
          </header>

          <div className="min-w-0 px-4 pb-16 pt-7 md:px-8">{children}</div>
        </div>
      </div>

      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-[90] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <motion.aside role="dialog" aria-modal="true" aria-label="Menú de administración" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-0 flex h-full w-[84%] max-w-xs flex-col gap-6 overflow-y-auto bg-white p-5 shadow-[var(--shadow-pop)]">
              <div className="flex items-center justify-between"><Brand /><button type="button" onClick={() => setDrawer(false)} aria-label="Cerrar menú" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface"><X className="h-6 w-6" /></button></div>
              <NavLinks onNavigate={() => setDrawer(false)} />
              <div className="mt-auto"><BackActions onBack={() => { setDrawer(false); goBack(); }} /></div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
