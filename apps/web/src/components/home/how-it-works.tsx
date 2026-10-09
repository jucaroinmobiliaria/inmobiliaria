import { Search, Calendar } from "@/components/ui/icon";
import { Handshake } from "@/components/search/icons";
import { Reveal } from "@/components/ui/misc";
import { SectionHeader } from "./section-header";

const STEPS = [
  { icon: Search, title: "Explora con calma", text: "Filtra por zona, precio y comodidades. Mira las fotos en grande y ubica cada inmueble en el mapa." },
  { icon: Calendar, title: "Escribe o agenda", text: "Pregunta lo que quieras o reserva una visita en el horario que te quede bien. Responden directo." },
  { icon: Handshake, title: "Cierra con confianza", text: "Visita, compara y decide. Guarda tus favoritos y recibe alertas si baja el precio o llega algo nuevo." },
];
export function HowItWorks() {
  return (
    <section id="como-funciona" className="container-x scroll-mt-24 pt-24 md:pt-32" aria-labelledby="como-titulo">
      <Reveal><SectionHeader eyebrow="Cómo funciona" title={<span id="como-titulo">Encontrar tu lugar, <em className="italic">sin complicarte</em></span>} /></Reveal>
      <ol className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <Reveal delay={i * 0.1} className="relative h-full border-t border-ink pt-6">
              <span className="font-display text-[5.5rem] leading-[0.8] tracking-tight text-brand-600/90" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
              <div className="mt-6 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700"><s.icon className="h-5 w-5" strokeWidth={1.8} /></span><h3 className="font-display text-[1.9rem] leading-tight">{s.title}</h3></div>
              <p className="mt-3 max-w-sm text-[16px] leading-relaxed text-ink-2">{s.text}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
