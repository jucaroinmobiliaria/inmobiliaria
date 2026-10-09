"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog } from "@/components/ui/misc";
import { api, ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Catalog, DraftDTO, ImageDTO, SessionUser } from "@/lib/types";
import { PhotoUploader } from "@/components/uploader/photo-uploader";
import { useUploader } from "@/components/uploader/use-uploader";
import { BottomBar, SegmentRail, StepsSheetHeader, TopBar, VerticalRail, type RailState } from "./chrome";
import { Callout } from "./fields";
import { draftToCard } from "./preview";
import { PreviewPanel } from "./preview-panel";
import { StepType, StepOperation } from "./step-basic";
import { StepContact } from "./step-contact";
import { StepAmenities, StepFeatures } from "./step-details";
import { StepLocation } from "./step-location";
import { StepPrice } from "./step-price";
import { StepReview, type SubmitIssue } from "./step-review";
import { StepText } from "./step-text";
import {
  BLOCKS, STEPS, TOTAL_STEPS, buildChecklist, completionPercent, findCity, findType, firstInvalidStep, reachableStep, stepDef, stepForKey, typeTraits, validateStep,
  type CheckItem, type PhotoState,
} from "./steps";
import type { StepProps } from "./types";
import { useDraft } from "./use-draft";
import { ExternalLink } from "@/components/uploader/icons";

interface Props { initialDraft: DraftDTO; catalog: Catalog; user: SessionUser; initialStep: number }

const SIMPLE: Record<number, ComponentType<StepProps>> = {
  1: StepOperation, 2: StepType, 3: StepLocation, 4: StepFeatures, 5: StepAmenities, 7: StepPrice, 8: StepText, 9: StepContact,
};

const variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -28 }),
};

const clampStep = (n: number) => Math.min(TOTAL_STEPS, Math.max(1, n));

/** Une la lista local con lo que el servidor dice que falta (sin duplicar lo que ya cubrimos). */
function withServerMissing(items: CheckItem[], missing: string[]): CheckItem[] {
  const covered = (s: string) => {
    const k = s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return /tipo|type/.test(k) || /ciudad|city/.test(k) || /precio|price/.test(k) || /titulo|title/.test(k) || /descrip/.test(k) || /portada|cover/.test(k) || /foto|imagen|image|photo/.test(k);
  };
  const extra = missing.filter((m) => !covered(m)).map<CheckItem>((m) => ({ id: `srv-${m}`, label: m, step: stepForKey(m) ?? TOTAL_STEPS, ok: false, required: true }));
  return extra.length ? [...items, ...extra] : items;
}

export function Wizard({ initialDraft, catalog, user, initialStep }: Props) {
  const router = useRouter();
  const dc = useDraft(initialDraft);
  const { draft, update, flush, save, serverErrors } = dc;
  const id = draft.id;

  /* --------------------------- fotos (motor) ---------------------------- */
  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshMeta = dc.refreshMeta;
  const refreshMetaSoon = useCallback(() => {
    if (metaTimer.current) clearTimeout(metaTimer.current);
    metaTimer.current = setTimeout(() => { void refreshMeta(); }, 900);
  }, [refreshMeta]);
  useEffect(() => () => { if (metaTimer.current) clearTimeout(metaTimer.current); }, []);

  const uploader = useUploader(id, initialDraft.images, {
    onNotice: (n) => toast[n.tone](n.text),
    onServerChange: refreshMetaSoon,
  });
  const photos = useMemo<PhotoState>(() => ({ ready: uploader.readyCount, busy: uploader.busyCount, hasCover: uploader.hasCover }), [uploader.readyCount, uploader.busyCount, uploader.hasCover]);

  /* ------------------------------ derivados ----------------------------- */
  const type = findType(catalog, draft.typeId);
  const city = findCity(catalog, draft.cityId);
  const traits = useMemo(() => typeTraits(type), [type]);
  const reachable = reachableStep(draft, photos);
  const canSubmit = draft.status === "DRAFT" || draft.status === "REJECTED";

  const previewImages = useMemo<ImageDTO[]>(
    () => uploader.items.filter((i) => i.status === "ready").map((i, idx) => ({
      id: i.imageId ?? i.key, url: i.thumb ?? i.url ?? "", width: i.width, height: i.height, position: idx, isCover: i.isCover, roomLabel: i.roomLabel, caption: i.caption, status: "READY" as const,
    })),
    [uploader.items],
  );
  const card = useMemo(() => draftToCard(draft, catalog, previewImages, user), [draft, catalog, previewImages, user]);
  const checklist = useMemo(() => withServerMissing(buildChecklist(draft, traits, photos), draft.completion.missing ?? []), [draft, traits, photos]);
  const percent = completionPercent(checklist);

  /* ------------------------------ navegación ---------------------------- */
  const [nav, setNav] = useState({ step: clampStep(initialStep), dir: 1 });
  const step = nav.step;
  const [maxVisited, setMaxVisited] = useState(canSubmit ? clampStep(initialStep) : TOTAL_STEPS);
  const [attempted, setAttempted] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const stepRef = useRef(step);
  stepRef.current = step;
  const reachRef = useRef(reachable);
  reachRef.current = reachable;
  const latest = useRef({ draft, photos });
  latest.current = { draft, photos };
  const scroller = useRef<HTMLDivElement>(null);
  const needFocus = useRef(false);
  const setHeading = useCallback((el: HTMLHeadingElement | null) => {
    if (el && needFocus.current) { needFocus.current = false; el.focus({ preventScroll: true }); }
  }, []);
  const firstRender = useRef(true);

  const navigate = useCallback((n: number, replace = false) => {
    const target = clampStep(n);
    try {
      const url = `${window.location.pathname}?paso=${target}`;
      if (replace) window.history.replaceState(null, "", url); else window.history.pushState(null, "", url);
    } catch { /* entornos sin history */ }
    setNav((p) => (p.step === target ? p : { step: target, dir: target > p.step ? 1 : -1 }));
    setAttempted(null);
  }, []);

  const goTo = useCallback((n: number) => {
    const target = clampStep(n);
    if (target === stepRef.current) return;
    void flush();
    if (target > reachRef.current) {
      const bad = firstInvalidStep(latest.current.draft, latest.current.photos) ?? reachRef.current;
      if (bad !== stepRef.current) navigate(bad);
      setAttempted(bad);
      return;
    }
    navigate(target);
  }, [flush, navigate]);

  // URL inicial y botones atrás/adelante del navegador.
  useEffect(() => {
    const cur = new URLSearchParams(window.location.search).get("paso");
    if (cur !== String(stepRef.current)) window.history.replaceState(null, "", `${window.location.pathname}?paso=${stepRef.current}`);
    const onPop = () => {
      const n = parseInt(new URLSearchParams(window.location.search).get("paso") ?? "", 10);
      if (n >= 1 && n <= TOTAL_STEPS) {
        const to = Math.min(n, reachRef.current);
        if (to !== n) window.history.replaceState(null, "", `${window.location.pathname}?paso=${to}`);
        setNav((p) => (p.step === to ? p : { step: to, dir: to > p.step ? 1 : -1 }));
        setAttempted(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Paso más lejano visitado (persistente por borrador) para marcar pasos como completados.
  useEffect(() => {
    try {
      const stored = parseInt(window.localStorage.getItem(`nido:wizard:${id}`) ?? "0", 10) || 0;
      setMaxVisited((m) => Math.max(m, stored));
    } catch { /* sin storage */ }
  }, [id]);
  useEffect(() => {
    setMaxVisited((m) => Math.max(m, step));
    try { const k = `nido:wizard:${id}`; const prev = parseInt(window.localStorage.getItem(k) ?? "0", 10) || 0; if (step > prev) window.localStorage.setItem(k, String(step)); } catch { /* noop */ }
  }, [step, id]);

  // Al cambiar de paso: arriba del todo y foco en el título.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    scroller.current?.scrollTo({ top: 0 });
    needFocus.current = true; // el título nuevo aparece cuando termina la salida del anterior: allí se le da el foco
  }, [step]);

  // Si el paso actual quedó fuera de alcance (p. ej. se borraron fotos), volvemos al primero pendiente.
  useEffect(() => {
    if (step > reachable) navigate(reachable, true);
  }, [step, reachable, navigate]);

  // Bloqueamos el scroll del documento: el asistente es una pantalla completa.
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    // El pie de página queda tapado por el asistente: lo sacamos del orden de tabulación y de los lectores de pantalla.
    const covered = Array.from(document.body.querySelectorAll<HTMLElement>(":scope > footer"));
    covered.forEach((f) => { f.inert = true; });
    return () => { el.style.overflow = prev; covered.forEach((f) => { f.inert = false; }); };
  }, []);

  // Aviso al cerrar la pestaña solo si hay algo sin guardar o fotos en vuelo.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dc.isDirty() || uploader.engine.hasActiveWork()) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dc, uploader.engine]);

  /* ------------------------------ validación ---------------------------- */
  const issues = useMemo(() => validateStep(step, draft, photos), [step, draft, photos]);
  const errors = useMemo(() => {
    const m: Record<string, string> = {};
    if (attempted === step) for (const i of issues) m[i.field] ??= i.message;
    for (const [k, v] of Object.entries(serverErrors)) if (v[0]) m[k] ??= v[0];
    return m;
  }, [attempted, step, issues, serverErrors]);
  // Los campos muestran su propio error; la barra inferior solo habla de lo que no tiene campo (las fotos).
  const notice = attempted === step ? issues.find((i) => i.field === "images")?.message ?? null : null;

  const states: RailState[] = useMemo(
    () => STEPS.map((s) => (s.n === step ? "current" : s.n > reachable ? "locked" : s.n < maxVisited && validateStep(s.n, draft, photos).length === 0 ? "done" : "todo")),
    [step, reachable, maxVisited, draft, photos],
  );
  const doneCount = states.filter((s) => s === "done").length;

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      const el = scroller.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (el && "focus" in el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) el.focus({ preventScroll: true });
    });
  };

  /* ------------------------------- acciones ----------------------------- */
  const [submitting, setSubmitting] = useState(false);
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [submitIssues, setSubmitIssues] = useState<SubmitIssue[]>([]);

  const leave = useCallback(async (to: string) => {
    const ok = await flush();
    if (!ok || uploader.engine.hasUploadsInFlight()) {
      const sure = window.confirm("Hay cambios o fotos que todavía no terminan de guardarse. Si sales ahora podrías perderlos. ¿Quieres salir de todos modos?");
      if (!sure) return;
    }
    router.push(to);
  }, [flush, router, uploader.engine]);

  const submit = async () => {
    setSubmitIssues([]);
    const missing = checklist.filter((c) => c.required && !c.ok);
    if (missing.length) {
      setSubmitIssues(missing.map((m) => ({ step: m.step, message: m.label })));
      toast.error("Faltan datos para publicar. Te mostramos cuáles.");
      return;
    }
    if (photos.busy > 0) { toast.info("Espera a que terminen de subir tus fotos."); return; }
    if (!terms) { setTermsError(true); focusFirstError(); return; }
    setTermsError(false);
    setSubmitting(true);
    const saved = await flush();
    if (!saved) { setSubmitting(false); toast.error("No pudimos guardar tus últimos cambios. Revisa tu conexión e inténtalo de nuevo."); return; }
    try {
      await api<DraftDTO>(`/publications/${id}/submit`, { method: "POST" });
      router.push(`/publicar/${id}/exito`);
    } catch (e) {
      setSubmitting(false);
      if (e instanceof ApiException && e.errors) {
        const list: SubmitIssue[] = [];
        for (const [field, msgs] of Object.entries(e.errors)) for (const m of msgs) list.push({ step: stepForKey(field) ?? stepForKey(m) ?? 0, message: m });
        setSubmitIssues(list.length ? list : [{ step: 0, message: e.message }]);
        toast.error(e.message || "Revisa los datos marcados.");
      } else {
        toast.error(e instanceof ApiException ? e.message : "No pudimos enviar tu aviso. Inténtalo de nuevo.");
      }
    }
  };

  const onNext = () => {
    if (step === TOTAL_STEPS) {
      if (canSubmit) void submit(); else void leave("/panel/publicaciones");
      return;
    }
    if (issues.length) { setAttempted(step); focusFirstError(); return; }
    goTo(step + 1);
  };
  const onBack = () => goTo(step - 1);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    const t = e.target as HTMLInputElement;
    if (t.tagName !== "INPUT" || ["checkbox", "radio", "button", "submit", "file", "range"].includes(t.type)) return;
    if (step === TOTAL_STEPS || step === 6) return;
    e.preventDefault();
    if (step === 8) { document.getElementById("description")?.focus(); return; }
    onNext();
  };

  /* -------------------------------- vista ------------------------------- */
  const def = stepDef(step);
  const stepProps: StepProps = { draft, catalog, user, update, errors, traits, type, city, go: goTo };
  const Simple = SIMPLE[step];

  const nextLabel = step < TOTAL_STEPS ? "Continuar" : canSubmit ? (draft.status === "REJECTED" ? "Enviar de nuevo" : "Publicar") : "Guardar y salir";

  return (
    <motion.div layoutRoot className="fixed inset-0 z-[60] flex flex-col bg-white text-ink" data-wizard>
      <TopBar
        save={save} onRetry={dc.retryNow} progress={((Math.max(doneCount, step - 1) + 0.5) / TOTAL_STEPS) * 100}
        onExit={() => void leave("/panel/publicaciones")} onLogo={() => void leave("/")}
      />
      <SegmentRail step={step} states={states} onGo={goTo} onMore={() => setSheet(true)} />

      <motion.div ref={scroller} layoutScroll data-wizard-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto grid max-w-[1480px] gap-x-12 px-4 py-8 md:px-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[200px_minmax(0,1fr)_360px]">
          <aside className="hidden xl:block" aria-label="Progreso">
            <div className="sticky top-10"><VerticalRail step={step} states={states} onGo={goTo} /></div>
          </aside>

          <div className="min-w-0 pb-10 lg:max-w-[780px]" onKeyDown={onKeyDown}>
            <StatusBanner draft={draft} />
            <AnimatePresence mode="wait" initial={false} custom={nav.dir}>
              <motion.div key={step} custom={nav.dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}>
                <header className="mb-8 md:mb-10">
                  <p className="eyebrow">Paso {step} de {TOTAL_STEPS} · {BLOCKS[def.block]}</p>
                  <h1 ref={setHeading} tabIndex={-1} className="display-md mt-2.5 text-balance outline-none">{def.title(draft.operation)}</h1>
                  <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-2">{def.subtitle}</p>
                </header>
                {Simple ? <Simple {...stepProps} /> : step === 6 ? (
                  <PhotoUploader uploader={uploader} kind={traits.kind} bedrooms={draft.bedrooms} error={errors.images} />
                ) : (
                  <StepReview
                    {...stepProps} card={card} images={previewImages} checklist={checklist} terms={terms} onTerms={(v) => { setTerms(v); if (v) setTermsError(false); }}
                    termsError={termsError} submitIssues={submitIssues} canSubmit={canSubmit}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <aside className="hidden lg:block" aria-label="Vista previa de tu aviso">
            <div className="sticky top-10 max-h-[calc(100dvh-12rem)] overflow-y-auto pb-6 pr-1 [scrollbar-width:thin]">
              <PreviewPanel card={card} percent={percent} items={checklist} onGo={goTo} hideCard={step === TOTAL_STEPS} />
            </div>
          </aside>
        </div>
      </motion.div>

      <BottomBar
        step={step} onBack={onBack} onNext={onNext} nextLabel={nextLabel} nextLoading={submitting} nextTone={step === TOTAL_STEPS && canSubmit ? "sun" : "primary"}
        message={notice} percent={percent} onPreview={() => setPreviewOpen(true)} hideBack={step === 1}
      />

      <Dialog open={sheet} onClose={() => setSheet(false)} sheet size="sm">
        <StepsSheetHeader onClose={() => setSheet(false)} />
        <div className="p-5"><VerticalRail step={step} states={states} onGo={goTo} onPick={() => setSheet(false)} /></div>
      </Dialog>
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} sheet size="md" title="Vista previa">
        <div className="p-5"><PreviewPanel card={card} percent={percent} items={checklist} onGo={(n) => { setPreviewOpen(false); goTo(n); }} hideCard={step === TOTAL_STEPS} /></div>
      </Dialog>
    </motion.div>
  );
}

function StatusBanner({ draft }: { draft: DraftDTO }) {
  if (draft.status === "DRAFT") return null;
  const view = draft.path && draft.status === "PUBLISHED" ? (
    <Link href={draft.path} className="ml-2 inline-flex items-center gap-1 font-semibold underline underline-offset-4">Ver aviso <ExternalLink className="h-3.5 w-3.5" /></Link>
  ) : null;
  const common = "mb-7";
  switch (draft.status) {
    case "REJECTED":
      return <Callout tone="danger" className={common}><b className="font-semibold">Tu aviso necesita cambios.</b> {draft.moderationNote || "Corrígelo y vuélvelo a enviar a revisión."}</Callout>;
    case "PENDING_REVIEW":
      return <Callout tone="info" className={common}><b className="font-semibold">Tu aviso está en revisión.</b> Un administrador lo aprueba antes de publicarlo. Puedes seguir editándolo; los cambios se guardan solos.</Callout>;
    case "PUBLISHED":
      return <Callout tone="success" className={common}><b className="font-semibold">Estás editando un aviso publicado.</b> Los cambios se guardan solos y se ven de inmediato.{view}</Callout>;
    case "PAUSED":
      return <Callout tone="warn" className={common}><b className="font-semibold">Este aviso está pausado.</b> Puedes editarlo; los cambios se guardan automáticamente.</Callout>;
    default:
      return <Callout tone="info" className={common}>Este aviso está en estado “{draft.status}”. Los cambios se guardan automáticamente.</Callout>;
  }
}
