"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Mail } from "@/components/ui/icon";
import { api } from "@/lib/api";
import { FormAlert } from "./login-form";
import { isEmail, readError, type FieldErrors } from "./form-utils";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!isEmail(email)) { setErrors({ email: "Escribe un correo válido, por ejemplo nombre@correo.com." }); return; }
    setErrors({}); setFormError(null); setBusy(true);
    try {
      await api("/auth/forgot", { body: { email: email.trim() } });
      setSent(true);
    } catch (err) {
      const r = readError(err);
      setErrors(r.fields); setFormError(r.form);
    } finally { setBusy(false); }
  }

  if (sent) {
    return (
      <div className="rounded-[24px] bg-brand-50 p-6" role="status">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white"><Mail className="h-6 w-6" /></span>
        <h2 className="mt-4 font-display text-[1.7rem] leading-tight">Revisa tu correo</h2>
        <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">Si <strong className="font-semibold text-ink">{email.trim()}</strong> tiene una cuenta en Jucaro, te enviamos un enlace para crear una nueva contraseña. Puede tardar un par de minutos; mira también en spam.</p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button href="/ingresar" variant="dark">Volver a ingresar</Button>
          <Button variant="outline" onClick={() => setSent(false)}>Usar otro correo</Button>
        </div>
      </div>
    );
  }
  return (
    <form method="post" action="#" onSubmit={submit} noValidate className="grid gap-5">
      {formError && <FormAlert>{formError}</FormAlert>}
      <Input label="Correo electrónico" type="email" name="email" autoComplete="email" inputMode="email" placeholder="nombre@correo.com" leading={<Mail className="h-[18px] w-[18px]" />} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoFocus />
      <Button type="submit" size="lg" loading={busy} className="w-full">Enviarme el enlace</Button>
      <p className="text-center text-[15px] text-ink-2">¿La recordaste? <Link href="/ingresar" className="font-semibold text-brand-700 underline-offset-4 hover:underline">Volver a ingresar</Link></p>
    </form>
  );
}
