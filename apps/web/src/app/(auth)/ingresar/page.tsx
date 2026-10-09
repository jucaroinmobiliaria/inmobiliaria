import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { landingFor, safeNext } from "@/components/auth/safe-next";
import { HERO_IMAGES } from "@/lib/images";

export const metadata: Metadata = { title: "Ingresar", description: "Ingresa a tu cuenta de Jucaro para guardar favoritos, escribir a anunciantes y gestionar tus publicaciones.", robots: { index: false, follow: true }, alternates: { canonical: "/ingresar" } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const user = await getUser();
  if (user) redirect(landingFor(user.role, next));
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <AuthShell
      eyebrow="Bienvenido de nuevo"
      title={<>Qué bueno verte <em className="italic">otra vez</em></>}
      subtitle={next?.startsWith("/publicar") ? "Ingresa para publicar tu inmueble en minutos." : "Ingresa para ver tus favoritos, tus mensajes y tus publicaciones."}
      image={HERO_IMAGES[2]!.src} alt={HERO_IMAGES[2]!.alt} seed={2}
      quote="Un hogar no se busca: se reconoce apenas cruzas la puerta." caption="Para quien ya empezó a buscar"
    >
      <LoginForm next={next} registerHref={`/registro${q}`} />
    </AuthShell>
  );
}
