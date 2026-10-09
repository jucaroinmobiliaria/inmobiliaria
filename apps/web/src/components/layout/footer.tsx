import Link from "next/link";
import { SITE } from "@/lib/site";
import { Logo } from "./logo";

const cols = [
  { title: "Explorar", links: [["Comprar", "/venta"], ["Arrendar", "/arriendo"], ["Apartamentos en Medellín", "/venta/apartamento/medellin"], ["Casas en Bogotá", "/venta/casa/bogota"], ["Arriendos en Cali", "/arriendo/apartamento/cali"]] },
  { title: "Para anunciantes", links: [["Publicar un inmueble", "/publicar"], ["Mi panel", "/panel"], ["Cómo funciona", "/#como-funciona"], ["Registro de agentes", "/registro?rol=AGENT"]] },
  { title: "Ayuda", links: [["Preguntas frecuentes", "/ayuda"], ["Consejos de seguridad", "/ayuda#seguridad"], ["Términos y condiciones", "/legal/terminos"], ["Política de privacidad", "/legal/privacidad"]] },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface pb-24 pt-16 md:pb-12">
      <div className="container-x grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{SITE.tagline}. Publica con fotos, mapa y contacto directo, sin intermediarios innecesarios.</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="eyebrow !text-ink">{c.title}</h3>
            <ul className="mt-4 grid gap-2.5">
              {c.links.map(([label, href]) => (
                <li key={label}><Link href={href} className="text-[15px] text-ink-2 transition-colors hover:text-brand-700">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container-x mt-14 flex flex-col justify-between gap-3 border-t border-line pt-6 text-sm text-ink-3 md:flex-row">
        <p>© {new Date().getFullYear()} {SITE.name}. Hecho en Colombia.</p>
        <p>Precios en pesos colombianos (COP). Las fotos y datos de ejemplo se reemplazan al publicar tus inmuebles.</p>
      </div>
    </footer>
  );
}
