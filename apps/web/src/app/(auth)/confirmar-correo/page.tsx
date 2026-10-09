import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailClient } from "@/components/auth/verify-email-client";
import { landingFor, safeNext } from "@/components/auth/safe-next";
import { Button } from "@/components/ui/button";
import { HERO_IMAGES } from "@/lib/images";

export const metadata: Metadata = { title: "Confirmar correo", robots: { index: false, follow: false }, alternates: { canonical: "/confirmar-correo" } };

export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<{ token?: string | string[]; next?: string | string[] }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const user = await getUser();
  if (user) redirect(landingFor(user.role, next));
  const token = (Array.isArray(sp.token) ? sp.token[0] : sp.token)?.trim();
  return (
    <AuthShell
      eyebrow="Un paso más"
      title={<>Confirma tu <em className="italic">correo</em></>}
      subtitle={token ? "Estamos creando tu cuenta. En un momento entras." : undefined}
      image={HERO_IMAGES[1]!.src} alt={HERO_IMAGES[1]!.alt} seed={1}
      quote="La casa que buscas empieza por un correo que sí es tuyo." caption="Confirmación de cuenta"
    >
      {token ? (
        <VerifyEmailClient token={token} next={next} />
      ) : (
        <div className="rounded-[24px] bg-surface p-6">
          <h2 className="font-display text-[1.6rem] leading-tight">Este enlace no es válido</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">Falta el código de seguridad. Ábrelo directamente desde el correo que te enviamos, o vuelve a registrarte para pedir uno nuevo.</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button href="/registro">Volver a registrarte</Button>
            <Link href="/ingresar" className="inline-flex h-11 items-center px-3 text-[15px] font-semibold text-brand-700 hover:underline">Ir a ingresar</Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
