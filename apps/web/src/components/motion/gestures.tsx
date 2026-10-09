"use client";

import { useEffect, useState } from "react";

export type BurstKind = "plane" | "trash" | "key" | "stamp" | "seal" | "pause" | "play" | "copy" | "renew" | "heart" | "reject";

type Burst = { id: number; kind: BurstKind; x: number; y: number };

/** Dispara una animación en el punto del botón. No bloquea la acción. */
export function burst(kind: BurstKind, origin?: HTMLElement | null) {
  if (typeof window === "undefined") return;
  const r = origin?.getBoundingClientRect();
  const detail: Burst = {
    id: Date.now() + Math.random(),
    kind,
    x: r ? r.left + r.width / 2 : window.innerWidth / 2,
    y: r ? r.top + r.height / 2 : window.innerHeight - 96,
  };
  window.dispatchEvent(new CustomEvent("jucaro:burst", { detail }));
}

/** Gestos de acciones que se ejecutan al instante (no abren un diálogo). */
export function menuBurst(label: string): BurstKind | null {
  const s = label.toLowerCase();
  if (s.startsWith("aprobar")) return "stamp";
  if (s.startsWith("pausar")) return "pause";
  if (s.startsWith("reanudar")) return "play";
  if (s.startsWith("duplicar")) return "copy";
  if (s.startsWith("renovar")) return "renew";
  if (s.includes("destacar")) return "stamp";
  return null;
}

export function confirmBurst(label: string): BurstKind {
  const s = label.toLowerCase();
  if (/eliminar|retirar/.test(s)) return "trash";
  if (/vendido|arrendado|confirmar/.test(s)) return "key";
  if (/rechazar/.test(s)) return "reject";
  if (/aprobar/.test(s)) return "stamp";
  if (/guardar|completar/.test(s)) return "seal";
  return "seal";
}

export function ActionStage() {
  const [items, setItems] = useState<Burst[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<Burst>).detail;
      if (!d?.kind) return;
      setItems((xs) => [...xs.slice(-10), d]);
      window.setTimeout(() => setItems((xs) => xs.filter((i) => i.id !== d.id)), 1200);
    };
    window.addEventListener("jucaro:burst", on);
    return () => window.removeEventListener("jucaro:burst", on);
  }, []);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      {items.map((b) => (
        <span key={b.id} className={`j-burst j-burst-${b.kind}`} style={{ left: b.x, top: b.y }}>
          <Glyph kind={b.kind} />
        </span>
      ))}
    </div>
  );
}

function Glyph({ kind }: { kind: BurstKind }) {
  if (kind === "plane") return <PaperPlane />;
  if (kind === "trash") return <TrashCan />;
  if (kind === "key") return <KeyTurn />;
  if (kind === "stamp") return <Stamp />;
  if (kind === "reject") return <RejectStamp />;
  if (kind === "pause") return <Blinds open={false} />;
  if (kind === "play") return <Blinds open />;
  if (kind === "copy") return <CopySheets />;
  if (kind === "renew") return <Renew />;
  if (kind === "heart") return <HeartPop />;
  return <Seal />;
}

function PaperPlane() {
  return (
    <svg className="j-plane" viewBox="0 0 48 48" fill="none">
      <path className="j-trail" d="M6 34c8-2 12-8 14-16" stroke="#C9A15A" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M8 28.5 40 8.5 24.5 40.5 21.2 27.2 8 28.5Z" fill="#fff" stroke="#145C4C" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M21.2 27.2 40 8.5" stroke="#145C4C" strokeWidth="1.4" />
      <path d="m21.2 27.2 3.3 13.3 4.2-8.6" fill="#E4EEE9" stroke="#145C4C" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function TrashCan() {
  return (
    <svg className="j-bin" viewBox="0 0 48 48" fill="none">
      <rect className="j-scrap" x="21" y="16" width="6" height="8" rx="1" fill="#C9A15A" />
      <g className="j-lid">
        <path d="M16 16.5h16" stroke="#145C4C" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 16.2v-2.2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2.2" stroke="#145C4C" strokeWidth="1.7" strokeLinecap="round" />
      </g>
      <path d="M15.5 19.5h17l-1.2 16.2a2 2 0 0 1-2 1.8h-10.6a2 2 0 0 1-2-1.8L15.5 19.5Z" fill="#fff" stroke="#145C4C" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M21 24.5v8M27 24.5v8" stroke="#145C4C" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function KeyTurn() {
  return (
    <svg className="j-key" viewBox="0 0 48 48" fill="none">
      <circle cx="18" cy="20" r="7" fill="#fff" stroke="#145C4C" strokeWidth="1.8" />
      <circle cx="18" cy="20" r="2.4" fill="#C9A15A" />
      <path d="M24.2 22.6 36 31.2l-3.2 3.4-2.6-2.2-2.2 2.2-2.4-2.4 2.2-2.2-2.2-2.4 4.6-5Z" fill="#fff" stroke="#145C4C" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function Stamp() {
  return (
    <svg className="j-stamp" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="14" fill="#145C4C" />
      <circle cx="24" cy="24" r="10.5" stroke="#C9A15A" strokeWidth="1.4" />
      <path d="m16.8 24.4 4.6 4.6 10-10.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RejectStamp() {
  return (
    <svg className="j-stamp" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="14" fill="#B42318" />
      <path d="m17.5 17.5 13 13M30.5 17.5l-13 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function Seal() {
  return (
    <svg className="j-seal" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="13" fill="#C4522A" />
      <circle cx="24" cy="24" r="9.5" stroke="#F8EBE4" strokeWidth="1.2" />
      <path d="m17.6 24.5 3.8 3.8 8.8-9" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Blinds({ open }: { open?: boolean }) {
  return (
    <svg className={open ? "j-blinds j-blinds-open" : "j-blinds"} viewBox="0 0 48 48" fill="none">
      <rect x="10" y="12" width="28" height="24" rx="3" fill="#fff" stroke="#145C4C" strokeWidth="1.7" />
      <path className="j-slat" d="M13 18h22M13 23h22M13 28h22" stroke="#145C4C" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M22 12v-2h4" stroke="#C9A15A" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CopySheets() {
  return (
    <svg className="j-copy" viewBox="0 0 48 48" fill="none">
      <rect x="14" y="14" width="18" height="22" rx="3" fill="#E4EEE9" stroke="#145C4C" strokeWidth="1.6" />
      <rect className="j-sheet" x="18" y="10" width="18" height="22" rx="3" fill="#fff" stroke="#145C4C" strokeWidth="1.6" />
    </svg>
  );
}

function Renew() {
  return (
    <svg className="j-renew" viewBox="0 0 48 48" fill="none">
      <path d="M24 12a12 12 0 1 1-8.5 3.5" stroke="#145C4C" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 10.5v6.2h6" stroke="#C9A15A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartPop() {
  return (
    <svg className="j-heart" viewBox="0 0 48 48" fill="none">
      <path d="M24 36s-11-6.8-11-14.2C13 17.2 16.2 14 19.8 14c2.2 0 3.6 1.1 4.2 2.4.6-1.3 2-2.4 4.2-2.4 3.6 0 6.8 3.2 6.8 7.8C35 29.2 24 36 24 36Z" fill="#E5484D" />
    </svg>
  );
}
