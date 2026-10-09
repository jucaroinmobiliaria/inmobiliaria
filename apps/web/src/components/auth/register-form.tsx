"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/phone-input";
import { Check, Mail, Search, User } from "@/components/ui/icon";
import { isValidPhone } from "@/lib/phone";
import { Handshake, Key } from "@/components/search/icons";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { PasswordInput, StrengthMeter } from "./password-input";
import { FormAlert } from "./login-form";
import { isEmail, readError, type FieldErrors } from "./form-utils";
import { burst } from "@/components/motion/gestures";

export type RegRole = "USER" | "OWNER" | "AGENT";
const ROLES: { value: RegRole; title: string; text: string; icon: React.ReactNode }[] = [
  { value: "USER", title: "Busco un inmueble", text: "Para comprar o arrendar.", icon: <Search className="h-5 w-5" /> },
  { value: "OWNER", title: "Soy propietario", text: "Quiero vender o arrendar el mío.", icon: <Key className="h-5 w-5" /> },
  { value: "AGENT", title: "Soy agente", text: "Publico para mis clientes.", icon: <Handshake className="h-5 w-5" /> },
];

export function RegisterForm({ next: _next, initialRole, loginHref }: { next: string | null; initialRole: RegRole; loginHref: string }) {
  const { register } = useSession();
  const [role, setRole] = useState<RegRole>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const local: FieldErrors = {};
    if (name.trim().length < 2) local.name = "Cuéntanos tu nombre.";
    if (!isEmail(email)) local.email = "Escribe un correo válido, por ejemplo nombre@correo.com.";
    if (phone.trim() && !isValidPhone(phone)) local.phone = "Revisa el número de teléfono.";
    if (password.length < 8) local.password = "Usa al menos 8 caracteres.";
    if (!terms) local.terms = "Debes aceptar los términos para crear tu cuenta.";
    setErrors(local); setFormError(null);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      const r = await register({ name: name.trim(), email: email.trim(), password, role, ...(phone.trim() ? { phone: phone.trim() } : {}) });
      setPendingEmail(r.email);
      setEmailSent(r.emailSent !== false);
    } catch (err) {
      const r = readError(err);
      setErrors(r.fields);
      setFormError(r.form);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!pendingEmail || busy) return;
    setBusy(true);
    try {
      const r = await api<{ ok: true; emailSent?: boolean }>("/auth/resend-verification", { body: { email: pendingEmail } });
      const sent = r.emailSent !== false;
      setEmailSent(sent);
      if (sent) toast.success("Si el correo sigue pendiente, te enviamos el enlace de nuevo.");
      else toast.error("El correo no salió. En Supabase configura el SMTP en Authentication → Emails y vuelve a reenviar.");
    } catch (err) {
      const r = readError(err);
      toast.error(r.form ?? "No pudimos reenviar el correo. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (pendingEmail) {
    return (
      <div className="rounded-[24px] bg-brand-50 p-6" role="status">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white"><Mail className="h-6 w-6" /></span>
        <h2 className="mt-4 font-display text-[1.7rem] leading-tight">{emailSent ? "Revisa tu correo" : "No pudimos enviar el correo"}</h2>
        <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">
          {emailSent ? (
            <>Te enviamos un enlace a <strong className="font-semibold text-ink">{pendingEmail}</strong> para confirmar y crear tu cuenta. Hasta que lo abras, no podrás entrar. Puede tardar un par de minutos; mira también en spam. El correo ya figura en Authentication de Supabase.</>
          ) : (
            <>Guardamos <strong className="font-semibold text-ink">{pendingEmail}</strong> en Authentication de Supabase, pero el mensaje no salió. Abre el proyecto, entra a Authentication → Emails y configura el SMTP. Después pulsa reenviar.</>
          )}
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button loading={busy} onClick={() => void resend()}>Reenviar correo</Button>
          <Button variant="outline" onClick={() => setPendingEmail(null)}>Usar otro correo</Button>
        </div>
      </div>
    );
  }

  return (
    <form method="post" action="#" onSubmit={submit} noValidate className="grid gap-5">
      {formError && <FormAlert>{formError}</FormAlert>}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">¿Qué quieres hacer?</legend>
        <div role="radiogroup" aria-label="Tipo de cuenta" className="grid gap-2.5 sm:grid-cols-3">
          {ROLES.map((r) => {
            const on = role === r.value;
            return (
              <label key={r.value} className={cn("relative flex cursor-pointer flex-row items-center gap-3 rounded-[18px] border p-3.5 transition-all sm:flex-col sm:items-start sm:gap-2.5 sm:p-4", on ? "border-brand-600 bg-brand-50 shadow-[0_0_0_3px_rgb(10_107_80/0.12)]" : "border-line-strong hover:border-ink")}>
                <input type="radio" name="role" value={r.value} checked={on} onChange={() => setRole(r.value)} className="peer sr-only" />
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors", on ? "bg-brand-600 text-white" : "bg-surface text-ink-2")}>{r.icon}</span>
                <span className="min-w-0"><span className="block text-[14.5px] font-semibold leading-tight">{r.title}</span><span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{r.text}</span></span>
                {on && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white"><Check className="h-3 w-3" strokeWidth={3.5} /></span>}
                <span className="pointer-events-none absolute inset-0 rounded-[18px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600" />
              </label>
            );
          })}
        </div>
      </fieldset>

      <Input label="Nombre completo" name="name" autoComplete="name" placeholder="Ana María Restrepo" leading={<User className="h-[18px] w-[18px]" />} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <Input label="Correo electrónico" type="email" name="email" autoComplete="email" inputMode="email" placeholder="nombre@correo.com" leading={<Mail className="h-[18px] w-[18px]" />} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <PhoneInput label="Celular (opcional)" name="phone" value={phone} onChange={setPhone} error={errors.phone} hint="El equipo de Jucaro lo usa para coordinar. No se muestra en los avisos públicos." />
      <div className="grid gap-3">
        <PasswordInput label="Contraseña" name="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <StrengthMeter value={password} />
      </div>

      <div className="grid gap-1.5">
        <Checkbox checked={terms} onChange={setTerms} label={<>Acepto los <Link href="/legal/terminos" target="_blank" className="font-semibold text-brand-700 underline underline-offset-2">términos de uso</Link> y la <Link href="/legal/privacidad" target="_blank" className="font-semibold text-brand-700 underline underline-offset-2">política de privacidad</Link>.</>} />
        {errors.terms && <p role="alert" className="text-[13px] font-medium text-danger">{errors.terms}</p>}
      </div>

      <Button type="submit" size="lg" loading={busy} className="w-full" onClick={(e) => burst("seal", e.currentTarget)}>Crear mi cuenta</Button>
      <p className="text-center text-[15px] text-ink-2">¿Ya tienes cuenta? <Link href={loginHref} className="font-semibold text-brand-700 underline-offset-4 hover:underline">Ingresa</Link></p>
    </form>
  );
}
