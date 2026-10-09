import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-form";
import { Button } from "@/components/ui/button";
import { HERO_IMAGES } from "@/lib/images";

export const metadata: Metadata = { title: "Crear nueva contraseña", robots: { index: false, follow: false }, alternates: { canonical: "/restablecer" } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const sp = await searchParams;
  const token = (Array.isArray(sp.token) ? sp.token[0] : sp.token)?.trim();
  return (
    <AuthShell
      eyebrow="Último paso"
      title={<>Elige tu nueva <em className="italic">contraseña</em></>}
      subtitle={token ? "Usa al menos 8 caracteres. Mejor si mezclas letras, números y un símbolo." : undefined}
      image={HERO_IMAGES[0]!.src} alt={HERO_IMAGES[0]!.alt} seed={0}
      quote="Casi listo: una contraseña nueva y vuelves a lo tuyo." caption="Tu cuenta, de nuevo contigo"
    >
      {token ? (
        <ResetForm token={token} />
      ) : (
        <div className="rounded-[24px] bg-surface p-6">
          <h2 className="font-display text-[1.6rem] leading-tight">Este enlace no es válido</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">Falta el código de seguridad. Pide un enlace nuevo desde la pantalla de recuperación y ábrelo directamente desde tu correo.</p>
          <div className="mt-5 flex flex-wrap gap-2.5"><Button href="/recuperar">Pedir un enlace nuevo</Button><Link href="/ingresar" className="inline-flex h-11 items-center px-3 text-[15px] font-semibold text-brand-700 hover:underline">Volver a ingresar</Link></div>
        </div>
      )}
    </AuthShell>
  );
}
