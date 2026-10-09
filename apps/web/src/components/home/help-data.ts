export type HelpGroup = { id: string; title: string; items: { q: string; a: string }[] };

export const HELP_GROUPS: HelpGroup[] = [
  {
    id: "buscar", title: "Buscar, comprar y arrendar",
    items: [
      { q: "¿Cómo encuentro un inmueble en una zona específica?", a: "Usa el buscador de la portada o la barra de filtros: escribe una ciudad o un barrio, elige el tipo de inmueble y ajusta precio, habitaciones y comodidades. También puedes dibujar tu zona en el mapa con “Buscar en esta zona”." },
      { q: "¿Qué significa que la ubicación sea aproximada?", a: "Algunos anunciantes prefieren no mostrar la dirección exacta hasta conocerte. En ese caso verás un área en el mapa y el anunciante te comparte la dirección al coordinar la visita." },
      { q: "¿Cómo agendo una visita?", a: "En la ficha del inmueble toca “Agendar visita”, elige el día y la franja que prefieras y envía la solicitud. El anunciante la confirma o te propone otro horario, y todo queda registrado en tu panel." },
      { q: "¿Cómo contacto al anunciante?", a: "Desde cada anuncio puedes escribir un mensaje, solicitar una visita o abrir WhatsApp para hablar con el equipo de Jucaro. Ellos coordinan contigo y con el anunciante. Jucaro no cobra comisión por ponerte en contacto." },
      { q: "¿Puedo guardar inmuebles y búsquedas?", a: "Sí. Toca el corazón de un anuncio para guardarlo, o “Guardar esta búsqueda” en los resultados para que te avisemos cuando aparezcan inmuebles nuevos con tus filtros. Todo queda en la sección Favoritos." },
    ],
  },
  {
    id: "publicar-faq", title: "Publicar tu inmueble",
    items: [
      { q: "¿Publicar en Jucaro tiene costo?", a: "No. Crear tu cuenta y publicar tu inmueble es gratis. Subes tus fotos, describes el inmueble y, cuando un administrador lo aprueba, tu anuncio queda visible." },
      { q: "¿Cuántas fotos necesito y cuáles funcionan mejor?", a: "Mínimo 3 fotos para enviar el anuncio, pero los que tienen 10 o más reciben muchas más consultas. Usa luz natural, fotografía en horizontal y muestra cada espacio: sala, cocina, habitaciones, baños y zonas comunes. La primera foto es la portada; puedes reordenarlas arrastrándolas." },
      { q: "¿Qué pasa después de enviar mi anuncio?", a: "Un administrador lo revisa para verificar que la información y las fotos sean claras. Si algo necesita ajustes, te avisamos qué cambiar. Cuando lo aprueba, el anuncio se publica y te notificamos." },
      { q: "¿Puedo editar o pausar mi anuncio?", a: "Sí, desde tu panel. Puedes cambiar el precio, las fotos o la descripción, pausar el anuncio mientras no esté disponible y marcarlo como vendido o arrendado cuando cierres el negocio." },
      { q: "Soy agente o inmobiliaria, ¿puedo publicar varios inmuebles?", a: "Claro. Crea tu cuenta como agente y publica todos los que quieras. Los anunciantes verificados muestran una insignia que da más confianza a quien busca." },
    ],
  },
  {
    id: "cuenta", title: "Tu cuenta y tus datos",
    items: [
      { q: "Olvidé mi contraseña, ¿qué hago?", a: "En la pantalla de ingreso toca “¿Olvidaste tu contraseña?”, escribe tu correo y te enviamos un enlace para crear una nueva. Si no llega en unos minutos, revisa la carpeta de spam." },
      { q: "¿Quién ve mi teléfono y mi correo?", a: "Solo el anunciante al que le escribes. Tu información de contacto no se muestra públicamente. Puedes revisar cómo la tratamos en la política de privacidad." },
      { q: "¿Cómo reporto un anuncio sospechoso?", a: "En la parte inferior de cada ficha encuentras “Reportar este anuncio”. Elige el motivo y cuéntanos qué viste; nuestro equipo lo revisa lo antes posible." },
    ],
  },
];

export const SAFETY_TIPS: { title: string; text: string }[] = [
  { title: "No pagues antes de conocer", text: "Nunca hagas anticipos, “separaciones” ni depósitos sin haber visitado el inmueble y verificado quién es el propietario o su representante." },
  { title: "Desconfía de las gangas", text: "Un precio muy por debajo del mercado, urgencia para decidir o historias de “viaje al exterior” son señales clásicas de estafa." },
  { title: "Visita siempre en persona", text: "Ve acompañado, de día y confirma que quien te atiende sea quien aparece en el anuncio. Verifica que las fotos coincidan con la realidad." },
  { title: "Revisa los papeles", text: "En una compra, pide el certificado de tradición y libertad actualizado. En un arriendo, exige el contrato por escrito y léelo completo antes de firmar." },
  { title: "Cuida tus datos", text: "No compartas códigos de verificación, claves ni fotos completas de tus documentos por chats no oficiales." },
  { title: "Paga de forma segura", text: "Evita transferencias a cuentas de terceros o en efectivo sin soporte. Pide siempre recibo o comprobante y haz los pagos a nombre del propietario." },
];

export const PUBLISH_STEPS: { title: string; text: string }[] = [
  { title: "Crea tu cuenta", text: "Regístrate gratis como propietario o agente. Solo necesitas tu correo." },
  { title: "Sube tus fotos", text: "Mínimo 3, ideal 10 o más. La primera será la portada y puedes reordenarlas." },
  { title: "Cuenta los detalles", text: "Tipo, ubicación en el mapa, precio, áreas, comodidades y una buena descripción." },
  { title: "Revisamos y publicamos", text: "Verificamos tu anuncio y, al aprobarse, queda visible. Gestionas todo desde tu panel." },
];
