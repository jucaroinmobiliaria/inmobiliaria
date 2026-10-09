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
  ArrowUpRight, Building2, ChartColumn, Database, Flag, LayoutDashboard, ListChecks, LogOut, Menu, Search, ScrollText, Users, X, House, User as UserIcon,
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

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { pending, reports } = useAdminCounts();
  return (
    <nav aria-label="Administración" className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{g.title}</p>
          <ul className="grid gap-0.5">
            {g.items.map((n) => {
              const active = n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(`${n.href}/`);
              const count = n.badge === "pending" ? pending : n.badge === "reports" ? reports : 0;
              return (
                <li key={n.href}>
                  <Link href={n.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={cn("flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors", active ? "bg-brand-50 text-brand-800" : "text-ink-2 hover:bg-surface hover:text-ink")}>
                    <n.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-600" : "text-ink-3")} strokeWidth={active ? 2.1 : 1.8} />
                    <span className="flex-1">{n.label}</span>
                    {count > 0 && <span aria-label={`${count} pendientes`} className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular", n.badge === "pending" ? "bg-brand-700 text-white" : "bg-heart text-white")}>{count}</span>}
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

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5" aria-label={`${SITE.name} — administración`}>
      <LogoMark className="h-8 w-8 text-brand-700" />
      <span className="font-display text-[1.6rem] leading-none tracking-tight">{SITE.name}</span>
      <span className="rounded-md bg-brand-900 px-1.5 py-1 text-[10px] font-bold uppercase leading-none tracking-wider text-white">Admin</span>
    </Link>
  );
}

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useSession();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [hi, setHi] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const searchWrap = useRef<HTMLDivElement>(null);

  useEffect(() => setDrawer(false), [pathname]);
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
      <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-7 overflow-y-auto border-r border-line bg-white px-4 py-5 lg:flex" aria-label="Barra lateral">
          <div className="px-2"><Brand /></div>
          <NavLinks />
          <div className="mt-auto grid gap-2">
            <Link href="/" className="flex h-10 items-center gap-3 rounded-xl border border-line px-3 text-sm font-semibold text-ink-2 transition hover:border-ink hover:text-ink"><House className="h-[18px] w-[18px]" />Volver al sitio<ArrowUpRight className="ml-auto h-4 w-4" /></Link>
            <div className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
              <Avatar name={user.name} src={user.avatarUrl} size={34} />
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-ink-3">Administrador</p></div>
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
              <Link href="/" className="hidden h-10 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm font-semibold hover:border-ink md:inline-flex">Volver al sitio<ArrowUpRight className="h-4 w-4" /></Link>
              <ActionMenu label="Menú de usuario" className="rounded-full" trigger={<span className="flex items-center gap-2 rounded-full border border-line-strong p-1 pr-3 transition hover:border-ink"><Avatar name={user.name} src={user.avatarUrl} size={30} /><span className="hidden max-w-[110px] truncate text-sm font-semibold sm:block">{user.name.split(" ")[0]}</span></span>}
                items={[
                  { label: "Volver al sitio", icon: <House />, href: "/" },
                  { label: "Mi panel", icon: <LayoutDashboard />, href: "/panel" },
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
              <Link href="/" className="mt-auto flex h-11 items-center gap-3 rounded-xl border border-line px-3 text-sm font-semibold"><House className="h-[18px] w-[18px]" />Volver al sitio</Link>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
