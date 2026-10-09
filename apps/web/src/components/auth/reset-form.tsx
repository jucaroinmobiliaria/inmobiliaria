"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { PasswordInput, StrengthMeter } from "./password-input";
import { FormAlert } from "./login-form";
import { readError, type FieldErrors } from "./form-utils";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const local: FieldErrors = {};
    if (password.length < 8) local.password = "Usa al menos 8 caracteres.";
    if (confirm !== password) local.confirm = "Las contraseñas no coinciden.";
    setErrors(local); setFormError(null);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await api("/auth/reset", { body: { token, password } });
      toast.success("Contraseña actualizada. Ya puedes ingresar.");
      router.replace("/ingresar");
    } catch (err) {
      const r = readError(err);
      setErrors({ ...r.fields, ...(r.fields.token ? {} : {}) });
      setFormError(r.fields.token ?? r.form ?? "El enlace no es válido o ya venció. Pide uno nuevo.");
      setBusy(false);
    }
  }

  return (
    <form method="post" action="#" onSubmit={submit} noValidate className="grid gap-5">
      {formError && (
        <div className="grid gap-2"><FormAlert>{formError}</FormAlert><Link href="/recuperar" className="text-[14px] font-semibold text-brand-700 underline-offset-4 hover:underline">Pedir un enlace nuevo</Link></div>
      )}
      <div className="grid gap-3">
        <PasswordInput label="Nueva contraseña" name="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoFocus />
        <StrengthMeter value={password} />
      </div>
      <PasswordInput label="Repite la contraseña" name="confirm" autoComplete="new-password" placeholder="Vuelve a escribirla" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
      <Button type="submit" size="lg" loading={busy} className="w-full">Guardar contraseña</Button>
    </form>
  );
}
