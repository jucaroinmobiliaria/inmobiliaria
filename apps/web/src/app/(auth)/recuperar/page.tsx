import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forgot-form";
import { HERO_IMAGES } from "@/lib/images";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false, follow: true }, alternates: { canonical: "/recuperar" } };

export default function ForgotPage() {
  return (
    <AuthShell
      eyebrow="Recuperar acceso"
      title={<>¿Olvidaste tu <em className="italic">contraseña</em>?</>}
      subtitle="Escribe tu correo y te enviamos un enlace para crear una nueva. Es rápido."
      image={HERO_IMAGES[3]!.src} alt={HERO_IMAGES[3]!.alt} seed={3}
      quote="Todo tiene arreglo, hasta una contraseña olvidada." caption="Te ayudamos a volver"
    >
      <ForgotForm />
    </AuthShell>
  );
}
