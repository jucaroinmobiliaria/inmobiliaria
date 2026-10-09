import { BadgeCheck, Calendar, Plus } from "@/components/ui/icon";
import { Handshake, Camera } from "@/components/search/icons";

const ITEMS = [
  { icon: BadgeCheck, text: "Anuncios verificados" },
  { icon: Camera, text: "Fotos reales" },
  { icon: Handshake, text: "Contacto directo" },
  { icon: Plus, text: "Publica gratis" },
  { icon: Calendar, text: "Agenda tu visita" },
] as const;

export function TrustMarquee() {
  const row = (hidden?: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {[...ITEMS, ...ITEMS].map((it, i) => (
        <li key={i} className="flex items-center">
          <span className="flex items-center gap-3 px-8 font-display text-[1.7rem] tracking-tight text-ink sm:text-3xl">
            <it.icon className="h-5 w-5 text-brand-600" strokeWidth={1.8} aria-hidden />{it.text}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-sun" aria-hidden />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Por qué Jucaro" className="mt-20 overflow-hidden border-y border-line bg-white py-6">
      <div className="flex w-max animate-marquee items-center hover:[animation-play-state:paused]">
        {row()}{row(true)}
      </div>
    </section>
  );
}
