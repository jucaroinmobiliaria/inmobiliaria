import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { LegalDoc, type LegalSection } from "@/components/home/legal-doc";

export const revalidate = 86400;
export const metadata: Metadata = { title: "Política de privacidad", description: `Cómo ${SITE.name} recoge, usa y protege tus datos personales.`, alternates: { canonical: "/legal/privacidad" } };

const S: LegalSection[] = [
  { title: "Responsable del tratamiento", body: [
    `${SITE.name} es responsable del tratamiento de tus datos personales. Puedes contactarnos en ${SITE.email}. Tratamos tus datos conforme a la Ley 1581 de 2012 y demás normas colombianas de protección de datos.`,
  ] },
  { title: "Qué datos recogemos", body: [
    "Datos de cuenta: nombre, correo electrónico, teléfono (opcional) y contraseña (almacenada de forma cifrada).",
    "Datos de uso: inmuebles que guardas, búsquedas, mensajes, solicitudes de visita y datos técnicos básicos como tipo de dispositivo o dirección IP.",
    "Datos de publicación: información, fotografías y ubicación de los inmuebles que anuncias, y el contacto que decidas compartir.",
  ] },
  { title: "Para qué los usamos", body: [
    "Para crear y gestionar tu cuenta, mostrar tus anuncios, ponerte en contacto con otros usuarios, enviar notificaciones y alertas de búsquedas guardadas, prevenir fraudes y mejorar el servicio.",
    "Solo usaremos tus datos para fines compatibles con estos propósitos o cuando la ley lo exija.",
  ] },
  { title: "Con quién los compartimos", body: [
    "Cuando escribes a un anunciante o solicitas una visita, compartimos con esa persona tu nombre y los datos de contacto que hayas indicado. No vendemos tus datos personales.",
    "Podemos apoyarnos en proveedores (alojamiento, correo, mapas) que tratan datos por encargo nuestro y bajo obligaciones de confidencialidad.",
  ] },
  { title: "Cookies y tecnologías similares", body: [
    "Usamos cookies estrictamente necesarias para mantener tu sesión iniciada y recordar preferencias básicas. Puedes borrarlas desde tu navegador; algunas funciones podrían dejar de estar disponibles.",
  ] },
  { title: "Tus derechos", body: [
    "Puedes conocer, actualizar, rectificar y suprimir tus datos, solicitar prueba de la autorización otorgada y revocarla, y presentar quejas ante la Superintendencia de Industria y Comercio.",
    `Para ejercer tus derechos escribe a ${SITE.email} indicando tu solicitud. Responderemos dentro de los plazos legales.`,
  ] },
  { title: "Seguridad y conservación", body: [
    "Aplicamos medidas técnicas y organizativas razonables para proteger tu información. Conservamos los datos mientras tengas cuenta o sea necesario para cumplir obligaciones legales.",
  ] },
  { title: "Cambios en esta política", body: [
    "Si actualizamos esta política publicaremos la versión vigente en esta página e indicaremos la fecha de la última actualización.",
  ] },
];

export default function PrivacyPage() {
  return <LegalDoc title="Política de privacidad" updated="octubre de 2026" intro="Tu privacidad importa. Aquí te contamos, en palabras sencillas, qué información recogemos y cómo la cuidamos." sections={S} other={{ href: "/legal/terminos", label: "Leer los términos y condiciones" }} />;
}
