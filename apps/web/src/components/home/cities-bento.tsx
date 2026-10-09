import Link from "next/link";
import { cn } from "@/lib/cn";
import type { HomeData } from "@/lib/types";
import { CITY_IMAGES } from "@/lib/images";
import { plural } from "@/lib/format";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/ui/misc";
import { ArrowUpRight } from "@/components/ui/icon";
import { SectionHeader } from "./section-header";

function spanFor(i: number, n: number) {
  if (i === 0) return "col-span-2 sm:row-span-2";
  const c: string[] = [];
  if (i === n - 1 && (n - 1) % 2 === 1) c.push("col-span-2");
  if (n >= 4) {
    if (i === 3) c.push("lg:col-span-2");
    else if (i === 4 && n === 5) c.push("lg:col-span-4");
    else if (i >= 4) c.push("lg:col-span-2");
  } else if (n === 3) c.push("lg:col-span-2");
  return c.join(" ");
}

export function CitiesBento({ cities }: { cities: HomeData["cities"] }) {
  const list = [...cities].sort((a, b) => b.count - a.count).slice(0, 6);
  if (!list.length) return null;
  return (
    <section className="container-x pt-24 md:pt-32" aria-labelledby="ciudades-titulo">
      <Reveal>
        <SectionHeader eyebrow="Ciudades" title={<span id="ciudades-titulo">Vive donde <em className="italic">quieres</em></span>} text="Las ciudades con más inmuebles publicados en Jucaro." />
      </Reveal>
      <ul className="mt-12 grid auto-rows-[200px] grid-cols-2 gap-3 sm:auto-rows-[220px] sm:gap-4 lg:grid-cols-4 lg:auto-rows-[240px]">
        {list.map((c, i) => (
          <li key={c.slug} className={cn("min-h-0", spanFor(i, list.length))}>
            <Reveal delay={i * 0.07} y={28} className="h-full">
              <Link href={`/venta?city=${c.slug}`} className="group relative block h-full overflow-hidden rounded-[28px] bg-surface-2 outline-offset-4">
                <Photo src={c.coverUrl ?? CITY_IMAGES[c.slug]} alt="" seed={i + 3} sizes="(min-width:1024px) 40vw, 90vw" widths={[600, 1000, 1400]}
                  className="absolute inset-0" imgClassName="transition-transform duration-[1600ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.07]" />
                <div className="scrim-bottom absolute inset-0" aria-hidden />
                <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink opacity-0 backdrop-blur transition-all duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"><ArrowUpRight className="h-5 w-5" /></span>
                <span className="absolute inset-x-5 bottom-5 text-white">
                  <span className={cn("block font-display leading-none tracking-tight", i === 0 ? "text-[2.6rem] sm:text-[3.4rem]" : "text-[1.9rem] sm:text-[2.2rem]")}>{c.name}</span>
                  <span className="mt-1.5 block text-[13px] font-medium text-white/85">{c.department} · {plural(c.count, "inmueble", "inmuebles")}</span>
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
