import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search } from "@/components/ui/icon";
import { PhotoFallback } from "@/components/ui/photo";

export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false, follow: true } };

const LINKS = [
  { href: "/venta", label: "Comprar" },
  { href: "/arriendo", label: "Arrendar" },
  { href: "/venta/apartamento/medellin", label: "Apartamentos en Medellín" },
  { href: "/publicar", label: "Publicar gratis" },
  { href: "/ayuda", label: "Ayuda" },
];

export default function NotFound() {
  return (
    <div className="container-x grid min-h-[calc(100dvh-68px)] grid-cols-1 items-center gap-12 pb-20 pt-[110px] lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
      <div className="min-w-0">
        <p className="eyebrow mb-4">Error 404</p>
        <h1 className="display-xl text-balance">Esta puerta no lleva a <em className="italic">ningún lado</em></h1>
        <p className="mt-5 max-w-lg text-[18px] leading-relaxed text-ink-2">La página que buscas no existe o ya no está disponible; quizá el inmueble se vendió o el enlace cambió. Busquemos algo mejor.</p>
        <form action="/venta" method="get" role="search" className="mt-8 flex max-w-xl items-center gap-2 rounded-full border border-line-strong bg-white p-1.5 pl-5 shadow-[var(--shadow-card)] transition focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15">
          <Search className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
          <label htmlFor="nf-q" className="sr-only">Buscar inmuebles</label>
          <input id="nf-q" name="q" type="search" placeholder="Barrio, ciudad o código del inmueble" autoComplete="off" className="h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3" />
          <Button type="submit" size="md">Buscar</Button>
        </form>
        <ul className="mt-6 flex flex-wrap gap-2.5">
          {LINKS.map((l) => <li key={l.href}><Link href={l.href} className="inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-sm font-semibold transition hover:border-ink hover:bg-surface">{l.label}</Link></li>)}
        </ul>
        <p className="mt-8"><Link href="/" className="text-[15px] font-semibold text-brand-700 underline-offset-4 hover:underline">← Volver al inicio</Link></p>
      </div>
      <div className="relative hidden aspect-[4/5] overflow-hidden rounded-[32px] lg:block" aria-hidden>
        <PhotoFallback seed={2} className="absolute inset-0" />
      </div>
    </div>
  );
}
