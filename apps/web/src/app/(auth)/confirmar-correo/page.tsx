import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailClient } from "@/components/auth/verify-email-client";
import { landingFor, safeNext } from "@/components/auth/safe-next";
import { HERO_IMAGES } from "@/lib/images";

export const metadata: Metadata = { title: "Confirmar correo", robots: { index: false, follow: false }, alternates: { canonical: "/confirmar-correo" } };

export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<{ token?: string | string[]; next?: string | string[] }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const user = await getUser();
  if (user) redirect(landingFor(user.role, next));
  const token = (Array.isArray(sp.token) ? sp.token[0] : sp.token)?.trim() || null;
  return (
    <AuthShell
      eyebrow="Un paso más"
      title={<>Confirma tu <em className="italic">correo</em></>}
      subtitle="Estamos creando tu cuenta. En un momento entras."
      image={HERO_IMAGES[1]!.src} alt={HERO_IMAGES[1]!.alt} seed={1}
      quote="La casa que buscas empieza por un correo que sí es tuyo." caption="Confirmación de cuenta"
    >
      <VerifyEmailClient token={token} next={next} />
    </AuthShell>
  );
}
