import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm, type RegRole } from "@/components/auth/register-form";
import { landingFor, safeNext } from "@/components/auth/safe-next";
import { HERO_IMAGES } from "@/lib/images";

export const metadata: Metadata = { title: "Crear cuenta", description: "Crea tu cuenta gratis en Jucaro para guardar inmuebles, agendar visitas o publicar el tuyo.", robots: { index: false, follow: true }, alternates: { canonical: "/registro" } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; rol?: string | string[] }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const user = await getUser();
  if (user) redirect(landingFor(user.role, next));
  const rolRaw = (Array.isArray(sp.rol) ? sp.rol[0] : sp.rol)?.toUpperCase();
  const initialRole: RegRole = rolRaw === "OWNER" || rolRaw === "AGENT" || rolRaw === "USER" ? rolRaw : next?.startsWith("/publicar") ? "OWNER" : "USER";
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <AuthShell
      eyebrow="Es gratis y toma un minuto"
      title={<>Crea tu cuenta y empieza tu <em className="italic">próxima historia</em></>}
      subtitle="Guarda tus inmuebles favoritos, agenda visitas o publica el tuyo con fotos, mapa y contacto directo."
      image={HERO_IMAGES[1]!.src} alt={HERO_IMAGES[1]!.alt} seed={1}
      quote="Publica en minutos y conversa con personas que sí quieren verlo." caption="Publicar en Jucaro es gratis"
    >
      <RegisterForm next={next} initialRole={initialRole} loginHref={`/ingresar${q}`} />
    </AuthShell>
  );
}
