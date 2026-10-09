import type { ReactNode } from "react";
import { Photo } from "@/components/ui/photo";
import { Quote } from "@/components/search/icons";
import { SITE } from "@/lib/site";

/** Estructura común de las pantallas de acceso: formulario a la izquierda, fotografía alta con cita a la derecha (oculta en móvil). */
export function AuthShell({
  title, subtitle, children, footer, image, alt = "", quote, caption, seed = 0, eyebrow,
}: {
  title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; image: string; alt?: string;
  quote: string; caption: string; seed?: number; eyebrow?: string;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-68px)] pt-[68px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 pb-14 pt-10 sm:px-10 lg:justify-center lg:px-16 lg:py-14">
        <div className="mx-auto w-full max-w-[440px]">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className="display-md text-balance md:!text-[2.9rem]">{title}</h1>
          {subtitle && <p className="mt-3 text-[16.5px] leading-relaxed text-ink-2">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-6 text-[15px] text-ink-2">{footer}</div>}
        </div>
      </div>

      <aside className="relative hidden p-4 pl-0 lg:block" aria-hidden>
        <div className="sticky top-[84px] h-[calc(100dvh-100px)] min-h-[560px] overflow-hidden rounded-[32px]">
          <Photo src={image} alt={alt} seed={seed} priority sizes="50vw" widths={[800, 1200, 1800]} className="h-full w-full" imgClassName="animate-kenburns" />
          <div className="scrim-hero absolute inset-0" />
          <figure className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
            <Quote className="mb-5 h-9 w-9 text-white/70" strokeWidth={1.4} />
            <blockquote className="font-display text-[2.4rem] leading-[1.1] tracking-tight text-balance xl:text-[2.9rem]">{quote}</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 text-[14px] font-medium text-white/85">
              <span className="h-px w-10 bg-white/60" />{caption} · {SITE.name}
            </figcaption>
          </figure>
        </div>
      </aside>
    </div>
  );
}
