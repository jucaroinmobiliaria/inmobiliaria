import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ApiException } from "@/lib/api";
import { apiServer, requireUser } from "@/lib/server";
import type { Catalog, DraftDTO } from "@/lib/types";
import { Wizard } from "@/components/wizard/wizard";
import { TOTAL_STEPS, reachableStep, type PhotoState } from "@/components/wizard/steps";

export const metadata: Metadata = { title: "Publicar un inmueble", robots: { index: false, follow: false } };

const photoState = (d: DraftDTO): PhotoState => {
  const ready = d.images.filter((i) => i.status === "READY");
  return { ready: ready.length, busy: d.images.length - ready.length, hasCover: ready.some((i) => i.isCover) };
};

async function loadDraft(id: string): Promise<DraftDTO | null> {
  try {
    return await apiServer<DraftDTO>(`/me/publications/${encodeURIComponent(id)}`, { auth: true });
  } catch (e) {
    if (e instanceof ApiException) {
      if (e.status === 404 || e.status === 400 || e.status === 403) return null;
      if (e.status === 401) redirect(`/ingresar?next=${encodeURIComponent(`/publicar/${id}`)}`);
    }
    throw e;
  }
}

export default async function PublishWizardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paso?: string | string[] }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/publicar/${id}`);
  const [draft, catalog] = await Promise.all([loadDraft(id), apiServer<Catalog>("/catalog", { revalidate: 60 })]);
  if (!draft) notFound();

  // Paso inicial: el pedido en ?paso (acotado a lo alcanzable) o, si no hay, donde se quedó (primer paso incompleto).
  const editable = draft.status === "DRAFT" || draft.status === "REJECTED";
  const reach = editable ? reachableStep(draft, photoState(draft)) : TOTAL_STEPS;
  const raw = Array.isArray(sp.paso) ? sp.paso[0] : sp.paso;
  const asked = raw ? parseInt(raw, 10) : NaN;
  const initialStep = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), editable ? reach : TOTAL_STEPS) : reach;

  return <Wizard initialDraft={draft} catalog={catalog} user={user} initialStep={initialStep} />;
}
