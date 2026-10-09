"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/form";
import { Eye } from "@/components/ui/icon";
import { EyeOff } from "@/components/search/icons";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: string; hint?: string; error?: string };

/** Campo de contraseña con botón mostrar/ocultar. */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <Input
      ref={ref}
      {...props}
      type={show ? "text" : "password"}
      trailing={
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show}
          className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600">
          {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  );
});

/** Medidor simple de fortaleza (0–4) con texto. */
export function passwordScore(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: "" };
  if (pw.length < 8) return { score: 1, label: "Muy débil" };
  let s = 2;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw)) s++;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) s++;
  s = Math.min(4, s);
  return { score: s, label: ["", "Muy débil", "Aceptable", "Buena", "Excelente"][s]! };
}

export function StrengthMeter({ value }: { value: string }) {
  const { score, label } = passwordScore(value);
  if (!value) return null;
  const tone = score <= 1 ? "bg-danger" : score === 2 ? "bg-sun" : "bg-brand-600";
  return (
    <div className="-mt-1" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= score ? tone : "bg-surface-2"}`} />)}
      </div>
      <p className="mt-1.5 text-[12.5px] text-ink-3">Seguridad: <span className="font-semibold text-ink-2">{label}</span>{value.length < 8 && " · mínimo 8 caracteres"}</p>
    </div>
  );
}
