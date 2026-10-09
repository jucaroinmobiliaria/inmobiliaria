"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { isValidPhone } from "@/lib/phone";
import { SITE } from "@/lib/site";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { SessionUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/phone-input";
import { Avatar, Badge, Skeleton } from "@/components/ui/misc";
import { burst } from "@/components/motion/gestures";
import { BadgeCheck, LogOut, Mail } from "@/components/ui/icon";
import { PageHeader, errText, fieldErrors, useAction } from "./common";

const ROLE: Record<SessionUser["role"], string> = { USER: "Usuario", OWNER: "Propietario", AGENT: "Agente inmobiliario", ADMIN: "Administrador" };

type Form = { name: string; phone: string; displayName: string; bio: string; whatsapp: string; company: string; website: string; city: string; avatarUrl: string };
const fromUser = (u: SessionUser): Form => ({
  name: u.name ?? "", phone: u.phone ?? "", displayName: u.profile.displayName ?? "", bio: u.profile.bio ?? "", whatsapp: u.profile.whatsapp ?? "",
  company: u.profile.company ?? "", website: u.profile.website ?? "", city: u.profile.city ?? "", avatarUrl: u.avatarUrl ?? "",
});

export function Account() {
  const { user, loading, setUser, logout } = useSession();
  if (loading && !user) return <div className="grid grid-cols-[minmax(0,1fr)] gap-6"><Skeleton className="h-24 w-80" /><Skeleton className="h-96 rounded-[20px]" /></div>;
  if (!user) return null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader eyebrow="Mi panel" title="Cuenta" description="Tu perfil es lo que ven los interesados cuando te contactan." />
      <Summary user={user} />
      <ProfileForm user={user} onSaved={setUser} />
      <PasswordForm />
      <section className="card grid gap-4 border-danger/25 p-5 md:p-6" aria-labelledby="zona">
        <div><h2 id="zona" className="text-lg font-semibold">Sesión y datos</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">Puedes cerrar tu sesión en este dispositivo cuando quieras. Si prefieres eliminar tu cuenta y tus datos, escríbenos y lo hacemos por ti; antes retiramos tus avisos para no dejar interesados sin respuesta.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={(e) => { burst("key", e.currentTarget); void logout(); }}><LogOut className="h-[18px] w-[18px]" />Cerrar sesión</Button>
          <Button variant="outline" href={`mailto:${SITE.email}?subject=${encodeURIComponent("Solicitud para eliminar mi cuenta")}`} className="hover:!border-danger hover:!text-danger"><Mail className="h-[18px] w-[18px]" />Solicitar eliminación de cuenta</Button>
        </div>
      </section>
    </div>
  );
}

function Summary({ user }: { user: SessionUser }) {
  return (
    <section className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center md:p-6" aria-label="Resumen de la cuenta">
      <Avatar name={user.name} src={user.avatarUrl} size={72} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-semibold">{user.name}</h2>
        <p className="truncate text-sm text-ink-2">{user.email}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone="brand">{ROLE[user.role]}</Badge>
          {user.verified ? <Badge tone="success"><BadgeCheck className="h-3.5 w-3.5" />Verificado</Badge> : <Badge tone="neutral">Sin verificar</Badge>}
        </div>
      </div>
      <dl className="text-sm sm:text-right">
        <dt className="text-ink-3">Miembro desde</dt><dd className="font-semibold first-letter:uppercase">{formatDate(user.createdAt, { month: "long", year: "numeric" })}</dd>
      </dl>
    </section>
  );
}

function ProfileForm({ user, onSaved }: { user: SessionUser; onSaved: (u: SessionUser) => void }) {
  const initial = useMemo(() => fromUser(user), [user]);
  const [f, setF] = useState<Form>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, run } = useAction();
  useEffect(() => setF(initial), [initial]);
  const dirty = (Object.keys(f) as (keyof Form)[]).some((k) => f[k] !== initial[k]);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF((p) => ({ ...p, [k]: e.target.value })); setErrors((p) => ({ ...p, [k]: "" })); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (f.name.trim().length < 2) local.name = "Escribe tu nombre completo.";
    if (f.phone.trim() && !isValidPhone(f.phone)) local.phone = "Revisa el número de teléfono.";
    if (f.whatsapp.trim() && !isValidPhone(f.whatsapp)) local.whatsapp = "Revisa el número de WhatsApp.";
    if (f.website && !/^https?:\/\/\S+\.\S+/.test(f.website.trim())) local.website = "Incluye el enlace completo, por ejemplo https://tuempresa.co";
    if (f.avatarUrl && !/^https?:\/\/\S+/.test(f.avatarUrl.trim())) local.avatarUrl = "Pega un enlace que empiece por https://";
    setErrors(local);
    if (Object.keys(local).length) return;
    const n = (v: string) => (v.trim() === "" ? null : v.trim());
    void run(async () => {
      try {
        const r = await api<{ user: SessionUser }>("/auth/me", { method: "PATCH", body: {
          name: f.name.trim(), phone: n(f.phone), displayName: n(f.displayName), bio: n(f.bio), whatsapp: n(f.whatsapp), company: n(f.company), website: n(f.website), city: n(f.city), avatarUrl: n(f.avatarUrl),
        } });
        onSaved(r.user);
        toast.success("Perfil actualizado");
      } catch (err) {
        const fe = fieldErrors(err);
        setErrors(fe);
        toast.error(Object.keys(fe).length ? "Revisa los campos marcados." : errText(err));
      }
    });
  };

  return (
    <form onSubmit={submit} className="card grid gap-5 p-5 md:p-6" aria-labelledby="perfil" noValidate>
      <div><h2 id="perfil" className="text-lg font-semibold">Perfil</h2><p className="text-sm text-ink-3">Esta información aparece en tus avisos.</p></div>
      <div className="grid items-start grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        <Input label="Nombre completo" required autoComplete="name" value={f.name} onChange={set("name")} error={errors.name} />
        <Input label="Nombre público" hint="Cómo te verán los interesados (opcional)." value={f.displayName} onChange={set("displayName")} error={errors.displayName} placeholder="Ej. Carlos · Inmuebles del Valle" />
        <PhoneInput label="Teléfono" value={f.phone} onChange={(v) => { setF((p) => ({ ...p, phone: v })); setErrors((p) => ({ ...p, phone: "" })); }} error={errors.phone} />
        <PhoneInput label="WhatsApp" value={f.whatsapp} onChange={(v) => { setF((p) => ({ ...p, whatsapp: v })); setErrors((p) => ({ ...p, whatsapp: "" })); }} error={errors.whatsapp} hint="Lo usa el equipo de Jucaro para coordinar. No se muestra en el aviso público." />
        <Input label="Empresa o inmobiliaria" autoComplete="organization" value={f.company} onChange={set("company")} error={errors.company} />
        <Input label="Ciudad" autoComplete="address-level2" value={f.city} onChange={set("city")} error={errors.city} placeholder="Medellín" />
        <Input label="Sitio web" type="url" inputMode="url" value={f.website} onChange={set("website")} error={errors.website} placeholder="https://" />
        <Input label="Foto de perfil (enlace)" type="url" inputMode="url" value={f.avatarUrl} onChange={set("avatarUrl")} error={errors.avatarUrl} placeholder="https://…/foto.jpg" />
      </div>
      <Textarea label="Sobre ti" value={f.bio} onChange={set("bio")} error={errors.bio} maxLength={600} placeholder="Cuéntale a los interesados quién eres y cómo trabajas." hint={`${f.bio.length}/600`} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        {dirty && <button type="button" onClick={() => { setF(initial); setErrors({}); }} className="text-sm font-semibold text-ink-2 hover:underline">Descartar cambios</button>}
        <Button type="submit" loading={busy} disabled={!dirty} onClick={(e) => { if (dirty) burst("seal", e.currentTarget); }}>Guardar cambios</Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [rep, setRep] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, run } = useAction();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!cur) local.current = "Escribe tu contraseña actual.";
    if (next.length < 8) local.next = "La nueva contraseña debe tener al menos 8 caracteres.";
    else if (next === cur) local.next = "La nueva contraseña debe ser distinta a la actual.";
    if (rep !== next) local.rep = "Las contraseñas no coinciden.";
    setErrors(local);
    if (Object.keys(local).length) return;
    void run(async () => {
      try {
        await api("/auth/change-password", { method: "POST", body: { current: cur, next } });
        toast.success("Contraseña actualizada");
        setCur(""); setNext(""); setRep(""); setErrors({});
      } catch (err) {
        const fe = fieldErrors(err);
        if (Object.keys(fe).length) setErrors({ current: fe.current ?? "", next: fe.next ?? fe.password ?? "" });
        else setErrors({ current: errText(err) });
        toast.error("No pudimos cambiar la contraseña.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="card grid gap-5 p-5 md:p-6" aria-labelledby="clave" noValidate>
      <div><h2 id="clave" className="text-lg font-semibold">Contraseña</h2><p className="text-sm text-ink-3">Usa una contraseña de al menos 8 caracteres que no uses en otros sitios.</p></div>
      <div className="grid items-start grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        <Input label="Contraseña actual" type="password" autoComplete="current-password" value={cur} onChange={(e) => { setCur(e.target.value); setErrors((p) => ({ ...p, current: "" })); }} error={errors.current} />
        <Input label="Nueva contraseña" type="password" autoComplete="new-password" value={next} onChange={(e) => { setNext(e.target.value); setErrors((p) => ({ ...p, next: "" })); }} error={errors.next} />
        <Input label="Repite la nueva" type="password" autoComplete="new-password" value={rep} onChange={(e) => { setRep(e.target.value); setErrors((p) => ({ ...p, rep: "" })); }} error={errors.rep} />
      </div>
      <div className="flex justify-end"><Button type="submit" loading={busy} disabled={!cur && !next && !rep} onClick={(e) => { if (cur || next || rep) burst("key", e.currentTarget); }}>Cambiar contraseña</Button></div>
    </form>
  );
}
