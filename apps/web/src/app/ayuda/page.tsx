import type { Metadata } from "next";
import { SITE, absoluteUrl } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/misc";
import { FaqAccordion } from "@/components/home/faq";
import { HELP_GROUPS, PUBLISH_STEPS, SAFETY_TIPS } from "@/components/home/help-data";
import { JsonLd } from "@/components/home/json-ld";
import { Breadcrumbs } from "@/components/search/landing-intro";
import { CalendarCheck, Handshake, Key, ShieldAlert } from "@/components/search/icons";
import { Mail, Search, WhatsAppIcon } from "@/components/ui/icon";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Centro de ayuda",
  description: "Respuestas a las preguntas frecuentes, guía para publicar tu inmueble y consejos de seguridad para comprar o arrendar sin sorpresas.",
  alternates: { canonical: "/ayuda" },
  openGraph: { title: `Centro de ayuda · ${SITE.name}`, description: "Preguntas frecuentes, guía para publicar y consejos de seguridad.", url: absoluteUrl("/ayuda") },
};

const QUICK = [
  { href: "#buscar", icon: <Search className="h-5 w-5" />, title: "Buscar y arrendar", text: "Filtros, visitas y contacto." },
  { href: "#publicar", icon: <Key className="h-5 w-5" />, title: "Publicar mi inmueble", text: "Paso a paso y gratis." },
  { href: "#seguridad", icon: <ShieldAlert className="h-5 w-5" />, title: "Consejos de seguridad", text: "Evita estafas." },
  { href: "#cuenta", icon: <Handshake className="h-5 w-5" />, title: "Mi cuenta", text: "Acceso y datos." },
];

export default function HelpPage() {
  const all = HELP_GROUPS.flatMap((g) => g.items);
  return (
    <div className="pt-[68px]">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: all.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <section className="border-b border-line bg-surface/60">
        <div className="container-x pb-14 pt-10 md:pb-20 md:pt-14">
          <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Ayuda" }]} className="mb-6" />
          <p className="eyebrow mb-3">Centro de ayuda</p>
          <h1 className="display-lg max-w-3xl text-balance">¿En qué podemos <em className="italic">ayudarte</em>?</h1>
          <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-ink-2">Aquí encuentras lo esencial para buscar con tranquilidad, publicar tu inmueble y evitar sorpresas.</p>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK.map((q) => (
              <li key={q.href}>
                <a href={q.href} className="group flex h-full items-center gap-4 rounded-[20px] border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[var(--shadow-lift)]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">{q.icon}</span>
                  <span><span className="block text-[15.5px] font-semibold">{q.title}</span><span className="block text-[13.5px] text-ink-3">{q.text}</span></span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="container-x grid gap-16 pb-24 pt-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-20 lg:pt-20">
        <nav aria-label="Secciones de ayuda" className="hidden lg:block">
          <ul className="sticky top-28 grid gap-1 border-l border-line pl-5 text-[15px]">
            {([["buscar", "Buscar y arrendar"], ["publicar", "Publicar tu inmueble"], ["seguridad", "Consejos de seguridad"], ["cuenta", "Tu cuenta y tus datos"], ["contacto", "Contáctanos"]] as const).map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="block rounded-lg px-2 py-1.5 text-ink-2 transition hover:bg-surface hover:text-ink">{label}</a></li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-24">
          <section id="buscar" className="scroll-mt-28" aria-labelledby="h-buscar">
            <h2 id="h-buscar" className="display-md mb-6">{HELP_GROUPS[0]!.title}</h2>
            <FaqAccordion items={HELP_GROUPS[0]!.items} defaultOpen={null} />
          </section>

          <section id="publicar" className="scroll-mt-28" aria-labelledby="h-publicar">
            <h2 id="h-publicar" className="display-md mb-3">Publica tu inmueble en 4 pasos</h2>
            <p className="mb-8 max-w-xl text-[17px] text-ink-2">Gratis, sin intermediarios y con el control de tu anuncio en un solo panel.</p>
            <ol className="grid gap-4 sm:grid-cols-2">
              {PUBLISH_STEPS.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 0.06} className="rounded-[24px] border border-line p-6">
                  <span className="font-display text-[2.4rem] leading-none text-brand-600">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-[18px] font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{s.text}</p>
                </Reveal>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-3"><Button href="/publicar" size="lg">Publicar gratis</Button><Button href="/registro?rol=AGENT" size="lg" variant="outline">Soy agente</Button></div>
            <div className="mt-10"><FaqAccordion items={HELP_GROUPS[1]!.items} defaultOpen={null} /></div>
          </section>

          <section id="seguridad" className="scroll-mt-28" aria-labelledby="h-seguridad">
            <p className="eyebrow mb-3">Tu tranquilidad primero</p>
            <h2 id="h-seguridad" className="display-md mb-3">Consejos para comprar y arrendar sin sorpresas</h2>
            <p className="mb-8 max-w-2xl text-[17px] text-ink-2">Revisamos cada anuncio antes de publicarlo, pero tú tienes la última palabra. Estas buenas prácticas te protegen en cualquier negocio inmobiliario.</p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {SAFETY_TIPS.map((t, i) => (
                <Reveal as="li" key={t.title} delay={(i % 2) * 0.06} className="flex gap-4 rounded-[24px] bg-surface p-6">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand-700 shadow-[var(--shadow-card)]"><ShieldAlert className="h-5 w-5" /></span>
                  <div><h3 className="text-[17px] font-semibold">{t.title}</h3><p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{t.text}</p></div>
                </Reveal>
              ))}
            </ul>
            <p className="mt-6 flex items-start gap-3 rounded-2xl border border-sun/50 bg-sun-soft p-4 text-[14.5px] text-sun-ink"><CalendarCheck className="mt-0.5 h-5 w-5 shrink-0" />¿Viste algo raro? Usa “Reportar este anuncio” al final de la ficha. Lo revisamos y, si incumple nuestras reglas, lo retiramos.</p>
          </section>

          <section id="cuenta" className="scroll-mt-28" aria-labelledby="h-cuenta">
            <h2 id="h-cuenta" className="display-md mb-6">{HELP_GROUPS[2]!.title}</h2>
            <FaqAccordion items={HELP_GROUPS[2]!.items} defaultOpen={null} />
          </section>

          <section id="contacto" className="scroll-mt-28 rounded-[32px] bg-brand-900 p-8 text-white md:p-12" aria-labelledby="h-contacto">
            <h2 id="h-contacto" className="display-md text-white">¿Sigues con dudas?</h2>
            <p className="mt-3 max-w-lg text-[17px] text-white/80">Escríbenos y te respondemos en horario laboral, de lunes a viernes.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href={`mailto:${SITE.email}`} variant="white" size="lg"><Mail className="h-5 w-5" />{SITE.email}</Button>
              <Button href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer" variant="outline" size="lg" className="!border-white/40 !bg-transparent !text-white hover:!bg-white/10"><WhatsAppIcon size={20} />WhatsApp</Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
