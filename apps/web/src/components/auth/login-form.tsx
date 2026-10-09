"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Mail, CircleAlert } from "@/components/ui/icon";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { PasswordInput } from "./password-input";
import { isEmail, readError, type FieldErrors } from "./form-utils";
import { landingFor } from "./safe-next";
import { burst } from "@/components/motion/gestures";

const DEMOS = [
  { label: "Usuario", email: "usuario@nido.co", password: "Demo1234!" },
  { label: "Propietario", email: "propietario@nido.co", password: "Demo1234!" },
  { label: "Agente", email: "agente@nido.co", password: "Demo1234!" },
  { label: "Admin", email: "admin@nido.co", password: "Admin1234!" },
];

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl bg-danger-soft px-4 py-3 text-[14.5px] font-medium text-danger">
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><span>{children}</span>
    </div>
  );
}

export function LoginForm({ next, registerHref }: { next: string | null; registerHref: string }) {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const local: FieldErrors = {};
    if (!isEmail(email)) local.email = "Escribe un correo válido, por ejemplo nombre@correo.com.";
    if (!password) local.password = "Escribe tu contraseña.";
    setErrors(local); setFormError(null);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`¡Hola de nuevo, ${user.name.split(" ")[0]}!`);
      router.replace(landingFor(user.role, next));
    } catch (err) {
      const r = readError(err);
      setErrors(r.fields);
      setFormError(r.form);
      setBusy(false);
    }
  }

  return (
    <form method="post" action="#" onSubmit={submit} noValidate className="grid gap-5">
      {formError && <FormAlert>{formError}</FormAlert>}
      <Input label="Correo electrónico" type="email" name="email" autoComplete="email" inputMode="email" placeholder="nombre@correo.com" leading={<Mail className="h-[18px] w-[18px]" />}
        value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoFocus />
      <div className="grid gap-2">
        <PasswordInput label="Contraseña" name="password" autoComplete="current-password" placeholder="Tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <div className="text-right"><Link href="/recuperar" className="text-[14px] font-semibold text-brand-700 underline-offset-4 hover:underline">¿Olvidaste tu contraseña?</Link></div>
      </div>
      <Button type="submit" size="lg" loading={busy} className="w-full" onClick={(e) => burst("door", e.currentTarget)}>Ingresar</Button>
      <p className="text-center text-[15px] text-ink-2">¿Aún no tienes cuenta? <Link href={registerHref} className="font-semibold text-brand-700 underline-offset-4 hover:underline">Crea una gratis</Link></p>

      {process.env.NODE_ENV !== "production" && (
        <div className="rounded-2xl border border-dashed border-line-strong p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3">Cuentas de demostración</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMOS.map((d) => (
              <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPassword(d.password); setErrors({}); setFormError(null); }}
                className="rounded-full border border-line-strong px-3.5 py-1.5 text-[13.5px] font-semibold transition hover:border-ink hover:bg-surface">{d.label}</button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
