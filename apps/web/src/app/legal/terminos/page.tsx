import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { LegalDoc, type LegalSection } from "@/components/home/legal-doc";

export const revalidate = 86400;
export const metadata: Metadata = { title: "Términos y condiciones", description: `Condiciones de uso de ${SITE.name}: cuentas, publicación de inmuebles, responsabilidades y reglas de la plataforma.`, alternates: { canonical: "/legal/terminos" } };

const S: LegalSection[] = [
  { title: "Quiénes somos y qué hacemos", body: [
    `${SITE.name} es una plataforma en línea que conecta a personas que buscan comprar o arrendar inmuebles con propietarios y agentes que desean publicarlos. ${SITE.name} actúa como intermediario tecnológico: no es parte de los contratos de compraventa o arrendamiento que se celebren entre usuarios.`,
  ] },
  { title: "Aceptación de los términos", body: [
    "Al crear una cuenta o usar el sitio aceptas estos términos y la política de privacidad. Si no estás de acuerdo, por favor no uses la plataforma.",
    "Debes ser mayor de edad y tener capacidad legal para celebrar contratos en Colombia.",
  ] },
  { title: "Tu cuenta", body: [
    "Eres responsable de la veracidad de los datos de tu cuenta y de mantener la confidencialidad de tu contraseña. Avísanos de inmediato si sospechas un uso no autorizado.",
    "Podemos suspender o cerrar cuentas que incumplan estos términos o la ley.",
  ] },
  { title: "Publicación de inmuebles", body: [
    "Quien publica declara ser propietario del inmueble o contar con autorización para ofrecerlo, y que la información, el precio y las fotografías son verídicos y actuales.",
    "Las publicaciones pasan por una revisión previa. Podemos rechazar, pausar o retirar anuncios que sean inexactos, engañosos, duplicados, que vulneren derechos de terceros o que incumplan la normativa aplicable.",
    "Al subir fotografías y textos nos concedes una licencia no exclusiva y gratuita para mostrarlos en la plataforma y en sus canales de difusión mientras el anuncio esté activo.",
  ] },
  { title: "Conductas no permitidas", body: [
    "Está prohibido publicar contenido falso o fraudulento, solicitar pagos anticipados engañosos, suplantar a otras personas, extraer datos de forma masiva o automatizada, y usar la plataforma para fines ilegales o para acosar a otros usuarios.",
  ] },
  { title: "Negociaciones entre usuarios", body: [
    `Las visitas, negociaciones, pagos y contratos se acuerdan directamente entre las partes. ${SITE.name} no garantiza la calidad, legalidad o disponibilidad de los inmuebles ni el cumplimiento de las obligaciones de los usuarios, y recomienda verificar toda la documentación antes de cerrar un negocio.`,
  ] },
  { title: "Costos", body: [
    "Crear una cuenta y publicar inmuebles es gratuito en este momento. Si introducimos servicios con costo, te lo informaremos con claridad antes de que decidas contratarlos.",
  ] },
  { title: "Propiedad intelectual", body: [
    `La marca, el diseño y el software de ${SITE.name} son de su titular y están protegidos por la ley. No puedes copiarlos ni usarlos sin autorización escrita.`,
  ] },
  { title: "Limitación de responsabilidad", body: [
    `En la medida permitida por la ley, ${SITE.name} no será responsable por daños indirectos derivados del uso de la plataforma, de la información publicada por terceros o de las negociaciones entre usuarios.`,
  ] },
  { title: "Cambios y contacto", body: [
    `Podemos actualizar estos términos; publicaremos la versión vigente en esta página. Para dudas o reclamos escríbenos a ${SITE.email}.`,
    "Estos términos se rigen por las leyes de la República de Colombia.",
  ] },
];

export default function TermsPage() {
  return <LegalDoc title="Términos y condiciones" updated="octubre de 2026" intro={`Bienvenido a ${SITE.name}. Estas condiciones explican cómo puedes usar nuestra plataforma de manera segura y justa para todos.`} sections={S} other={{ href: "/legal/privacidad", label: "Leer la política de privacidad" }} />;
}
