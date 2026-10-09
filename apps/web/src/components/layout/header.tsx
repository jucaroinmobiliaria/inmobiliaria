"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Bell, Heart, LayoutDashboard, LogOut, Menu, MessageCircle, Plus, Search, Settings, X, Building2, ShieldCheck } from "@/components/ui/icon";
import { Logo } from "./logo";

const NAV = [
  { href: "/venta", label: "Comprar" },
  { href: "/arriendo", label: "Arrendar" },
  { href: "/publicar", label: "Publicar" },
  { href: "/ayuda", label: "Ayuda" },
];

export function Header() {
  const pathname = usePathname();
  const { user, loading, logout } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const onHero = pathname === "/" && !scrolled;
  const hidden = pathname.startsWith("/publicar/") || pathname.startsWith("/admin");

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { setMenu(false); setDrawer(false); }, [pathname]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (hidden) return null;

  return (
    <>
      <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-500", onHero ? "bg-transparent" : "glass border-b border-line/80")}>
        <div className="container-x flex h-[68px] items-center justify-between gap-6">
          <div className="flex items-center gap-10">
            <Logo light={onHero} />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
              {NAV.map((n) => {
                const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href + "/"));
                return (
                  <Link key={n.href} href={n.href} className={cn("rounded-full px-4 py-2 text-[15px] font-semibold transition-colors",
                    onHero ? "text-white/90 hover:bg-white/15 hover:text-white" : "text-ink-2 hover:bg-surface hover:text-ink", active && !onHero && "bg-surface text-ink")}>
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            {pathname !== "/" && (
              <Link href="/venta" aria-label="Buscar" className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface"><Search className="h-5 w-5" /></Link>
            )}
            <Link href="/favoritos" aria-label="Favoritos" className={cn("hidden h-10 w-10 place-items-center rounded-full sm:grid", onHero ? "text-white hover:bg-white/15" : "text-ink hover:bg-surface")}><Heart className="h-5 w-5" /></Link>

            {loading ? <div className="skeleton h-10 w-24 rounded-full" /> : user ? (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu}
                  className={cn("flex items-center gap-2 rounded-full border p-1 pr-3 transition", onHero ? "border-white/40 text-white hover:bg-white/15" : "border-line-strong hover:border-ink")}>
                  <Avatar name={user.name} src={user.avatarUrl} size={32} />
                  <span className="hidden max-w-[110px] truncate text-sm font-semibold sm:block">{user.name.split(" ")[0]}</span>
                  {user.unreadNotifications > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-heart px-1 text-[11px] font-bold text-white">{user.unreadNotifications}</span>}
                </button>
                <AnimatePresence>
                  {menu && (
                    <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl border border-line bg-white p-2 text-ink shadow-[var(--shadow-pop)]">
                      <div className="px-3 pb-2 pt-1"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-ink-3">{user.email}</p></div>
                      <MenuLink href="/panel" icon={<LayoutDashboard className="h-[18px] w-[18px]" />}>Mi panel</MenuLink>
                      <MenuLink href="/panel/publicaciones" icon={<Building2 className="h-[18px] w-[18px]" />}>Mis publicaciones</MenuLink>
                      <MenuLink href="/panel/mensajes" icon={<MessageCircle className="h-[18px] w-[18px]" />}>Mensajes</MenuLink>
                      <MenuLink href="/favoritos" icon={<Heart className="h-[18px] w-[18px]" />}>Favoritos</MenuLink>
                      <MenuLink href="/panel/cuenta" icon={<Settings className="h-[18px] w-[18px]" />}>Mi cuenta</MenuLink>
                      {user.role === "ADMIN" && <MenuLink href="/admin" icon={<ShieldCheck className="h-[18px] w-[18px]" />}>Administración</MenuLink>}
                      <button role="menuitem" onClick={() => void logout()} className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-line px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface"><LogOut className="h-[18px] w-[18px]" />Cerrar sesión</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href={`/ingresar?next=${encodeURIComponent(pathname)}`} className={cn("hidden rounded-full px-4 py-2 text-[15px] font-semibold sm:block", onHero ? "text-white hover:bg-white/15" : "hover:bg-surface")}>Ingresar</Link>
            )}

            <Button href="/publicar" size="sm" variant={onHero ? "white" : "primary"} className="hidden sm:inline-flex"><Plus className="h-4 w-4" />Publicar gratis</Button>
            <button onClick={() => setDrawer(true)} aria-label="Abrir menú" className={cn("grid h-10 w-10 place-items-center rounded-full lg:hidden", onHero ? "text-white hover:bg-white/15" : "hover:bg-surface")}><Menu className="h-6 w-6" /></button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-[90] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white p-6 shadow-[var(--shadow-pop)]">
              <div className="flex items-center justify-between"><Logo /><button onClick={() => setDrawer(false)} aria-label="Cerrar menú" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface"><X className="h-6 w-6" /></button></div>
              <nav className="mt-8 grid gap-1" aria-label="Móvil">
                {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded-2xl px-4 py-3.5 font-display text-3xl hover:bg-surface">{n.label}</Link>)}
                <Link href="/favoritos" className="rounded-2xl px-4 py-3.5 font-display text-3xl hover:bg-surface">Favoritos</Link>
              </nav>
              <div className="mt-auto grid gap-3">
                {user ? <Button href="/panel" variant="outline">Ir a mi panel</Button> : <><Button href="/ingresar" variant="outline">Ingresar</Button><Button href="/registro">Crear cuenta</Button></>}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <Link role="menuitem" href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-surface"><span className="text-ink-3">{icon}</span>{children}</Link>;
}
