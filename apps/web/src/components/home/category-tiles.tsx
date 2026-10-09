import Link from "next/link";
import type { HomeData } from "@/lib/types";
import { CATEGORY_IMAGES } from "@/lib/images";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/ui/misc";
import { ArrowUpRight } from "@/components/ui/icon";
import { plural } from "@/lib/format";
import { SectionHeader } from "./section-header";

export function CategoryTiles({ types }: { types: HomeData["types"] }) {
  const list = [...types]
    .sort((a, b) => Number(!!CATEGORY_IMAGES[b.slug]) - Number(!!CATEGORY_IMAGES[a.slug]) || b.count - a.count)
    .slice(0, 6)
    .sort((a, b) => b.count - a.count);
  if (!list.length) return null;
  return (
    <section className="container-x pt-24 md:pt-32" aria-labelledby="tipos-titulo">
      <Reveal>
        <SectionHeader eyebrow="Explora por tipo" title={<span id="tipos-titulo">¿Qué estás <em className="italic">buscando</em>?</span>} text="Desde apartamentos en la ciudad hasta fincas para desconectarte. Elige un tipo y empieza." />
      </Reveal>
      <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {list.map((t, i) => (
          <li key={t.slug}>
            <Reveal delay={i * 0.06} y={30}>
              <Link href={`/venta/${t.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-[24px] bg-surface-2 outline-offset-4">
                <Photo src={CATEGORY_IMAGES[t.slug]} alt="" seed={i + 1} sizes="(min-width:1024px) 16vw, (min-width:768px) 33vw, 50vw" widths={[400, 700, 900]}
                  className="absolute inset-0" imgClassName="transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.09]" />
                <div className="scrim-bottom absolute inset-0 opacity-90" aria-hidden />
                <span className="absolute right-3 top-3 grid h-10 w-10 translate-y-1 scale-75 place-items-center rounded-full bg-white text-ink opacity-0 shadow-lg transition-all duration-500 ease-[var(--ease-spring)] group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100">
                  <ArrowUpRight className="h-5 w-5" aria-hidden />
                </span>
                <span className="absolute inset-x-4 bottom-4 text-white">
                  <span className="block font-display text-[1.7rem] leading-tight tracking-tight">{t.pluralName || t.name}</span>
                  <span className="mt-0.5 block text-[13px] font-medium text-white/80">{plural(t.count, "anuncio", "anuncios")}</span>
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
