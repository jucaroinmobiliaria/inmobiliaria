import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiException } from "@/lib/api";
import { apiServer, requireUser } from "@/lib/server";
import { formatPrice } from "@/lib/format";
import type { DraftDTO, Catalog } from "@/lib/types";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/ui/misc";
import { SuccessCelebration } from "@/components/wizard/success-celebration";
import { Camera, Check, Clock, ExternalLink, MessageCircle, Plus, Share2 } from "@/components/uploader/icons";

export const metadata: Metadata = { title: "¡Listo! Tu aviso está en camino", robots: { index: false, follow: false } };

async function loadDraft(id: string): Promise<DraftDTO | null> {
  try {
    return await apiServer<DraftDTO>(`/me/publications/${encodeURIComponent(id)}`, { auth: true });
  } catch (e) {
    if (e instanceof ApiException) {
      if (e.status === 404 || e.status === 400 || e.status === 403) return null;
      if (e.status === 401) redirect(`/ingresar?next=${encodeURIComponent(`/publicar/${id}/exito`)}`);
    }
    throw e;
  }
}

const COPY = {
  PENDING_REVIEW: { title: "¡Listo! Tu aviso está en revisión", text: "Un administrador lo revisa antes de publicarlo. Te avisamos en tu panel en cuanto quede aprobado." },
  PUBLISHED: { title: "¡Tu aviso ya está publicado!", text: "Ya aparece en la búsqueda y en el mapa. Los mensajes y las solicitudes de visita llegarán a tu panel." },
} as const;

export default async function PublishSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/publicar/${id}/exito`);
  const [draft, catalog] = await Promise.all([loadDraft(id), apiServer<Catalog>("/catalog", { revalidate: 300 }).catch(() => null)]);
  if (!draft) notFound();
  // Sin enviar todavía: de vuelta a la revisión final del asistente.
  if (draft.status === "DRAFT" || draft.status === "REJECTED") redirect(`/publicar/${id}?paso=10`);

  const copy = draft.status === "PUBLISHED" ? COPY.PUBLISHED : draft.status === "PENDING_REVIEW" ? COPY.PENDING_REVIEW : { title: "Tu aviso está guardado", text: "Puedes gestionarlo desde tu panel cuando quieras." };
  const ready = draft.images.filter((i) => i.status === "READY").sort((a, b) => a.position - b.position);
  const cover = ready.find((i) => i.isCover) ?? ready[0];
  const type = catalog?.types.find((t) => t.id === draft.typeId)?.name;
  const city = catalog?.cities.find((c) => c.id === draft.cityId)?.name;
  const where = [type, city].filter(Boolean).join(" · ");
  const published = draft.status === "PUBLISHED" && draft.path;

  const NEXT = [
    { icon: Clock, title: "Revisión en menos de 24 horas", text: "Verificamos fotos y datos para que quienes buscan confíen en tu aviso." },
    { icon: Check, title: "Te avisamos en tu panel", text: "Cuando se publique verás una notificación. Mientras tanto puedes editar lo que quieras." },
    { icon: MessageCircle, title: "Responde rápido", text: "Los primeros mensajes llegan a tu panel. Responder pronto marca la diferencia." },
  ] as const;

  return (
    <div className="min-h-dvh bg-white">
      <header className="flex h-16 items-center justify-between border-b border-line px-4 md:px-8">
        <Logo />
        <Button href="/panel/publicaciones" variant="outline" size="sm">Mis publicaciones</Button>
      </header>

      <main className="mx-auto max-w-[760px] px-4 pb-24 pt-14 text-center md:pt-20">
        <SuccessCelebration />
        <h1 className="display-lg mt-8 text-balance" tabIndex={-1}>{copy.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-[1.05rem] leading-relaxed text-ink-2">{copy.text}</p>

        <Reveal className="mt-10" delay={0.1}>
          <div className="mx-auto flex max-w-xl items-center gap-4 rounded-[24px] border border-line bg-white p-3 text-left shadow-[var(--shadow-card)]">
            <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-[16px] sm:h-28 sm:w-36">
              <Photo src={cover?.url} alt="Foto principal de tu aviso" seed={draft.code} className="h-full w-full" sizes="144px" />
              {cover && <span className="absolute left-1.5 top-1.5 rounded-full bg-sun px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">Portada</span>}
            </div>
            <div className="min-w-0 py-1 pr-2">
              <p className="line-clamp-2 text-[16px] font-semibold leading-snug text-ink">{draft.title || "Tu aviso"}</p>
              {where && <p className="mt-1 truncate text-[13.5px] text-ink-3">{where}</p>}
              <p className="mt-1.5 text-[15px] font-semibold text-brand-700">{formatPrice(draft.price, draft.currency)}{draft.operation === "RENT" ? <span className="font-normal text-ink-3"> / mes</span> : null}</p>
              <p className="mt-1 text-[12.5px] text-ink-3">Código {draft.code} · {ready.length} {ready.length === 1 ? "foto" : "fotos"}</p>
            </div>
          </div>
        </Reveal>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/panel/publicaciones" size="lg">Ver mis publicaciones</Button>
          <Button href="/publicar" size="lg" variant="outline"><Plus className="h-5 w-5" /> Publicar otro</Button>
          {published && <Button href={draft.path!} size="lg" variant="ghost"><ExternalLink className="h-5 w-5" /> Ver mi aviso</Button>}
        </div>

        <section className="mt-16 text-left">
          <h2 className="font-display text-[2rem] leading-tight">Qué sigue</h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-3">
            {NEXT.map((n, i) => (
              <Reveal as="li" key={n.title} delay={0.08 * i}>
                <div className="h-full rounded-[22px] border border-line bg-white p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-600"><n.icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-[15.5px] font-semibold leading-snug">{n.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{n.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="mt-10 rounded-[24px] bg-surface p-6 text-left sm:p-7">
          <h2 className="text-[16px] font-semibold">Para que te escriban más</h2>
          <ul className="mt-3 grid gap-2.5 text-[14.5px] leading-snug text-ink-2">
            <li className="flex gap-3"><Camera className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> Con 8 fotos o más, de varias habitaciones y con buena luz, el aviso genera más confianza.</li>
            <li className="flex gap-3"><MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> Mantén tu WhatsApp activo y responde en el mismo día.</li>
            <li className="flex gap-3"><Share2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> Cuando se publique, comparte el enlace con tus contactos.</li>
          </ul>
          <p className="mt-4 text-[13.5px] text-ink-3">¿Algo por corregir? <Link href={`/publicar/${draft.id}?paso=10`} className="font-semibold text-brand-700 underline underline-offset-4">Edita tu aviso</Link> cuando quieras.</p>
        </section>
      </main>
    </div>
  );
}
