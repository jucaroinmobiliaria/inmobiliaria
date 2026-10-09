import Link from "next/link";
import { SITE } from "@/lib/site";
import { TriangleAlert } from "@/components/search/icons";
import { Breadcrumbs } from "@/components/search/landing-intro";

export type LegalSection = { title: string; body: string[] };

/** Documento legal sencillo: título, aviso de plantilla, índice y secciones numeradas. */
export function LegalDoc({ title, intro, updated, sections, other }: { title: string; intro: string; updated: string; sections: LegalSection[]; other: { href: string; label: string } }) {
  return (
    <div className="pt-[68px]">
      <div className="container-x pb-24 pt-10 md:pt-14">
        <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Legal" }, { label: title }]} className="mb-6" />
        <div className="grid gap-12 lg:grid-cols-[240px_minmax(0,720px)] lg:gap-20">
          <aside className="hidden lg:block">
            <nav aria-label="Contenido" className="sticky top-28">
              <p className="eyebrow mb-4">Contenido</p>
              <ol className="grid gap-1 border-l border-line pl-4 text-[14.5px]">
                {sections.map((s, i) => <li key={s.title}><a href={`#s${i + 1}`} className="block rounded-md px-2 py-1.5 text-ink-2 transition hover:bg-surface hover:text-ink">{i + 1}. {s.title}</a></li>)}
              </ol>
            </nav>
          </aside>
          <article>
            <p className="eyebrow mb-3">Legal</p>
            <h1 className="display-lg text-balance">{title}</h1>
            <p className="mt-3 text-[14px] text-ink-3">Última actualización: {updated}</p>
            <div role="note" className="mt-7 flex items-start gap-3 rounded-2xl border border-sun/50 bg-sun-soft p-4 text-[14.5px] leading-relaxed text-sun-ink">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <p><strong className="font-semibold">Texto de ejemplo (plantilla).</strong> Este documento es un borrador genérico y debe ser revisado y ajustado por un abogado antes de publicar {SITE.name} en producción.</p>
            </div>
            <p className="mt-8 text-[17.5px] leading-[1.75] text-ink-2">{intro}</p>
            <div className="mt-4 space-y-10">
              {sections.map((s, i) => (
                <section key={s.title} id={`s${i + 1}`} className="scroll-mt-28" aria-labelledby={`t${i + 1}`}>
                  <h2 id={`t${i + 1}`} className="font-display text-[1.9rem] leading-tight tracking-tight">{i + 1}. {s.title}</h2>
                  <div className="mt-3 space-y-4 text-[16.5px] leading-[1.75] text-ink-2">{s.body.map((p, j) => <p key={j}>{p}</p>)}</div>
                </section>
              ))}
            </div>
            <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-[15px]">
              <Link href={other.href} className="font-semibold text-brand-700 underline-offset-4 hover:underline">{other.label}</Link>
              <Link href="/ayuda" className="text-ink-2 underline-offset-4 hover:underline">Ir al centro de ayuda</Link>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
