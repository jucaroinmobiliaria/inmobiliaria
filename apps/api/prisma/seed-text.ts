/** Generador de títulos, descripciones y mensajes en español colombiano para la semilla. */
import type { TypeSlug } from "./seed-data.ts";

export type Rng = {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
  chance(p: number): boolean;
  shuffle<T>(arr: readonly T[]): T[];
};

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  return {
    next,
    int,
    pick: (arr) => arr[Math.floor(next() * arr.length)]!,
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j]!, a[i]!];
      }
      return a;
    },
  };
}

export interface TextCtx {
  rng: Rng;
  type: TypeSlug;
  op: "SALE" | "RENT";
  city: string;
  hood: string | null;
  place: string; // barrio o, si no hay, ciudad
  vibe: string;
  landmarks: string[];
  area: number | null;
  landArea: number | null;
  beds: number | null;
  baths: number | null;
  parking: number | null;
  stratum: number | null;
  floor: number | null;
  ageYears: number | null;
  condition: "NEW" | "USED" | "OFF_PLAN";
  furnished: boolean;
  petFriendly: boolean;
  negotiable: boolean;
  adminFee: number | null;
  price: number;
  minContractMonths: number | null;
  hot: boolean;
  amenityNames: string[];
  amenitySlugs: string[];
}

const NOUN: Record<TypeSlug, { name: string; fem: boolean }> = {
  apartamento: { name: "apartamento", fem: false },
  casa: { name: "casa", fem: true },
  apartaestudio: { name: "apartaestudio", fem: false },
  penthouse: { name: "penthouse", fem: false },
  finca: { name: "finca", fem: true },
  lote: { name: "lote", fem: false },
  local: { name: "local comercial", fem: false },
  oficina: { name: "oficina", fem: true },
  bodega: { name: "bodega", fem: true },
  consultorio: { name: "consultorio", fem: false },
};

const ADJ = ["luminoso", "moderno", "amplio", "acogedor", "remodelado", "cómodo", "impecable", "espectacular"];
const ADJ_POST = ["funcional", "bien ubicado", "luminoso", "moderno", "amplio", "remodelado", "impecable", "acogedor"];
const inflect = (adj: string, fem: boolean) => {
  if (!fem) return adj;
  return adj
    .split(" ")
    .map((w) => (w.endsWith("o") ? `${w.slice(0, -1)}a` : w.endsWith("ado") ? w : w))
    .join(" ");
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const money = (n: number) => `$${new Intl.NumberFormat("es-CO").format(n)}`;
const lower = (s: string) => (/^[A-Z]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const list = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const ha = (m2: number) => (m2 >= 10000 ? `${(m2 / 10000).toFixed(1).replace(".", ",")} hectáreas` : `${new Intl.NumberFormat("es-CO").format(m2)} m²`);

/** "de el" → "del", "a el" → "al" (no toca "El Poblado" con mayúscula). */
const contract = (s: string) => s.replace(/\bde el\b/g, "del").replace(/\bDe el\b/g, "Del").replace(/\ba el\b/g, "al");

export function makeTitle(c: TextCtx): string {
  return contract(rawTitle(c));
}

function rawTitle(c: TextCtx): string {
  const { rng, type, op } = c;
  const n = NOUN[type];
  const t = n.name;
  const Tcap = cap(t);
  const a = inflect(rng.pick(ADJ), n.fem);
  const ap = inflect(rng.pick(ADJ_POST), n.fem);
  const place = c.place;
  const beds = c.beds ?? 0;
  const lm = c.landmarks[0] ?? place;
  const nice = c.amenityNames.find((x) => /piscina|gimnasio|terraza|balcón|vista|jacuzzi/i.test(x));
  const sale = op === "SALE";
  switch (type) {
    case "apartamento":
    case "penthouse":
    case "apartaestudio": {
      const rooms = type === "apartaestudio" ? "" : ` de ${plural(beds, "habitación", "habitaciones")}`;
      const opts = sale
        ? [`${cap(a)} ${t}${rooms} en ${place}`, `${Tcap} en venta en ${place}, ${c.city}`, `${cap(a)} ${t} con ${lower(nice ?? "excelente ubicación")} en ${place}`, `Vendo ${t} de ${c.area} m² en ${place}`, `${Tcap} ${ap} cerca de ${lm}`]
        : [`Arriendo ${t}${c.furnished ? " amoblado" : ""}${rooms} en ${place}`, `${Tcap} en arriendo en ${place}, ${c.city}`, `${cap(a)} ${t} para arrendar en ${place}`, `${Tcap} ${c.furnished ? "amoblado" : ap} cerca de ${lm}`];
      return rng.pick(opts);
    }
    case "casa":
      return rng.pick(sale
        ? [`${cap(a)} casa de ${plural(beds, "habitación", "habitaciones")} en ${place}`, `Casa en venta en ${place}, ${c.city}`, `Vendo casa de ${c.area} m² en ${place}`, `${cap(a)} casa con ${lower(nice ?? "patio y zona social")} en ${place}`]
        : [`Arriendo casa de ${plural(beds, "habitación", "habitaciones")} en ${place}`, `Casa en arriendo en ${place}, ${c.city}`, `${cap(a)} casa para arrendar en ${place}`]);
    case "finca":
      return rng.pick([`Finca de recreo con ${plural(beds, "habitación", "habitaciones")} cerca de ${c.city}`, `${cap(a)} finca de ${ha(c.landArea ?? 0)} en ${place}`, `Finca con piscina y zonas verdes en ${place}`]);
    case "lote":
      return rng.pick([`Lote de ${c.area} m² en ${place}`, `Lote ideal para construir en ${place}`, `Lote con excelente ubicación en ${place}, ${c.city}`]);
    case "local":
      return rng.pick([`Local comercial de ${c.area} m² en ${place}`, `Local ${a} sobre vía principal en ${place}`, `Local comercial en ${place} con alto flujo peatonal`]);
    case "oficina":
      return rng.pick([`Oficina de ${c.area} m² en ${place}`, `Oficina ${a} con parqueadero en ${place}`, `Oficina en ${place}, ${c.city}, lista para operar`]);
    case "bodega":
      return rng.pick([`Bodega de ${c.area} m² con acceso para tractomulas`, `Bodega industrial en ${place}, ${c.city}`, `Bodega ${a} con muelle de cargue en ${place}`]);
    case "consultorio":
      return rng.pick([`Consultorio ${a} en ${place}`, `Consultorio de ${c.area} m² cerca de clínicas en ${place}`, `Consultorio listo para atender pacientes en ${place}`]);
  }
}

/* ---------------------------------------------------------------------------------------- */

function tokens(c: TextCtx) {
  const n = NOUN[c.type];
  const fem = n.fem;
  return {
    type: n.name,
    Type: cap(n.name),
    el: fem ? "la" : "el",
    El: fem ? "La" : "El",
    un: fem ? "una" : "un",
    Un: fem ? "Una" : "Un",
    este: fem ? "esta" : "este",
    Este: fem ? "Esta" : "Este",
    adj: inflect(c.rng.pick(ADJ_POST), fem),
    place: c.place,
    city: c.city,
    vibe: c.vibe,
    lm1: c.landmarks[0] ?? c.place,
    lm2: c.landmarks[1] ?? c.landmarks[0] ?? c.city,
    area: String(c.area ?? ""),
    beds: String(c.beds ?? ""),
    baths: String(c.baths ?? ""),
    strat: String(c.stratum ?? ""),
  } as Record<string, string>;
}
const fill = (tpl: string, t: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k: string) => t[k] ?? "");

const has = (c: TextCtx, slug: string) => c.amenitySlugs.includes(slug);

function amenityPhrase(c: TextCtx, slugs: string[], max = 4): string[] {
  return c.amenityNames.filter((_, i) => slugs.includes(c.amenitySlugs[i]!)).slice(0, max).map(lower);
}

const BUILDING = ["piscina", "gimnasio", "porteria-24h", "salon-comunal", "juegos-infantiles", "zona-bbq", "circuito-de-camaras", "conjunto-cerrado", "ascensor", "planta-electrica", "parqueadero-de-visitantes", "zonas-verdes"];

const CLOSERS = [
  "Agenda tu visita y compruébalo por ti mismo.",
  "Escríbenos hoy y coordinamos una visita a tu medida.",
  "No lo dejes pasar: contáctanos y resolvemos todas tus dudas.",
  "Con gusto te enviamos más fotos y te acompañamos en todo el proceso.",
  "Pregunta sin compromiso, respondemos rápido y con toda la información.",
  "Si lo que buscas es calidad y buena ubicación, vale la pena conocerlo.",
];

function locationSentence(c: TextCtx, t: Record<string, string>): string {
  const two = c.landmarks.length > 1;
  const opts = [
    two ? `Estás a pocos minutos de ${t.lm1} y ${t.lm2}, con transporte, comercio y servicios muy cerca.` : `Estás a pocos minutos de ${t.lm1}, con transporte, comercio y servicios muy cerca.`,
    `La ubicación en ${t.place} es de lo mejor de ${t.city}: un sector ${t.vibe}, con ${t.lm1} a la vuelta de la esquina.`,
    two ? `Vivir aquí significa tener ${t.lm1} y ${t.lm2} a la mano, sin perder la tranquilidad del sector.` : `Vivir aquí significa tener ${t.lm1} a la mano, sin perder la tranquilidad del sector.`,
    `${t.place} es un sector ${t.vibe}; desde aquí llegas fácil a ${t.lm1} y a las principales vías de ${t.city}.`,
  ];
  return c.rng.pick(opts);
}

function termsSentence(c: TextCtx): string {
  const admin = c.adminFee ? `administración de ${money(c.adminFee)} al mes` : "";
  if (c.op === "SALE") {
    const cond = c.condition === "NEW" ? "Es un inmueble nuevo, listo para escriturar" : c.condition === "OFF_PLAN" ? "Se entrega sobre planos con fiduciaria y fecha de entrega pactada" : c.ageYears && c.ageYears > 15 ? "Se encuentra en buen estado y con mantenimiento al día" : "Se encuentra en excelente estado";
    const s = c.stratum ? `, estrato ${c.stratum}` : "";
    return `${cond}${s}${admin ? `, con ${admin}` : ""}. ${c.negotiable ? "El valor es negociable y se estudian propuestas serias." : "Escrituras al día y documentación completa."}`;
  }
  const months = c.minContractMonths ?? 12;
  return `Canon mensual de ${money(c.price)}${admin ? ` más ${admin}` : ", administración incluida"}. Contrato mínimo de ${months} meses${c.petFriendly ? " y se aceptan mascotas" : ""}${c.furnished ? "; se entrega amoblado" : ""}.`;
}

function residentialUnit(c: TextCtx, t: Record<string, string>): string[] {
  const { rng } = c;
  const studio = c.type === "apartaestudio";
  const sentences: string[] = [];
  // Apertura
  if (c.op === "SALE") {
    sentences.push(
      rng.pick([
        `${t.Un} ${t.type} ${t.adj} de ${t.area} m² en ${t.place}, un sector ${t.vibe}.`,
        `Vendo ${t.type} en ${t.place}, ${t.city}, con ${t.area} m² bien distribuidos y mucha luz natural.`,
        studio ? `Ubicado en ${t.place}, ${t.este} ${t.type} ofrece ${t.area} m² muy bien aprovechados para vivir o invertir.` : `Ubicado en ${t.place}, ${t.este} ${t.type} ofrece ${t.beds} alcobas, ${t.baths} baños y ${t.area} m² pensados para vivir con comodidad.`,
        `Una excelente oportunidad para vivir en ${t.place}: ${t.type} de ${t.area} m² en un sector ${t.vibe}.`,
      ]),
    );
  } else {
    const who = studio ? "una persona o pareja" : rng.pick(["una familia", "una pareja", "profesionales", "ejecutivos que valoran su tiempo"]);
    sentences.push(
      rng.pick([
        `Se arrienda ${t.type} de ${t.area} m² en ${t.place}, ${t.city}, ideal para ${who}.`,
        `Arriendo ${t.type} ${c.furnished ? "amoblado" : "listo para habitar"} en ${t.place}, un sector ${t.vibe}.`,
        studio ? `Disfruta de vivir en ${t.place} en ${t.este} ${t.type} de ${t.area} m², disponible para arriendo.` : `Disfruta de vivir en ${t.place} en ${t.este} ${t.type} de ${t.beds} habitaciones y ${t.baths} baños, disponible para arriendo.`,
      ]),
    );
  }
  // Interior
  const interior: string[] = [];
  if (studio) {
    interior.push("Su distribución inteligente aprovecha cada metro: zona de descanso, cocina y baño bien definidos, sin perder amplitud.");
    interior.push("Cuenta con ventanales que llenan el espacio de luz y una cocina funcional con buen espacio de almacenamiento.");
  } else {
    interior.push("La sala y el comedor son amplios e integrados, con ventanales que dejan entrar mucha luz natural.");
    interior.push(has(c, "cocina-integral") ? "La cocina es integral, con mesón en granito y excelente espacio de almacenamiento." : "La cocina es semiabierta y cuenta con buena ventilación y espacio para electrodomésticos.");
    if ((c.beds ?? 0) >= 2) interior.push("La habitación principal tiene baño privado y closet, y las demás alcobas son cómodas y ventiladas.");
    interior.push("Los acabados son de buena calidad: pisos en porcelanato, carpintería en excelente estado y grifería moderna.");
  }
  if (c.type === "penthouse") interior.push("La terraza privada es la gran protagonista: perfecta para reuniones al aire libre con vista despejada de la ciudad.");
  if (has(c, "balcon") && !studio) interior.push("Tiene balcón con vista despejada, ideal para el café de la mañana.");
  if (has(c, "aire-acondicionado")) interior.push(`Cuenta con aire acondicionado, muy útil para el clima de ${t.city}.`);
  if (has(c, "estudio")) interior.push("Incluye un estudio independiente, perfecto para trabajar desde casa.");
  if (has(c, "zona-de-lavanderia")) interior.push("Dispone de zona de lavandería independiente.");
  sentences.push(...rng.shuffle(interior).slice(0, c.type === "penthouse" ? 3 : 2));
  // Zonas comunes
  const common = amenityPhrase(c, BUILDING, 4);
  if (common.length >= 2) sentences.push(rng.pick([`El edificio ofrece ${list(common)}.`, `Dentro del conjunto encontrarás ${list(common)}.`, `Entre sus zonas comunes destacan ${list(common)}.`]));
  if ((c.parking ?? 0) > 0) sentences.push(`Incluye ${plural(c.parking!, "parqueadero", "parqueaderos")}${rng.chance(0.5) ? " cubierto" + (c.parking! > 1 ? "s" : "") : ""}.`);
  sentences.push(locationSentence(c, t));
  sentences.push(termsSentence(c));
  sentences.push(rng.pick(CLOSERS));
  return sentences;
}

function house(c: TextCtx, t: Record<string, string>): string[] {
  const { rng } = c;
  const s: string[] = [];
  s.push(
    c.op === "SALE"
      ? rng.pick([
          `Casa ${t.adj} de ${t.area} m² en ${t.place}, ${t.city}, perfecta para quienes quieren espacio y tranquilidad en un sector ${t.vibe}.`,
          `Vendo casa en ${t.place} con ${t.beds} habitaciones, ${t.baths} baños y ${c.landArea ? `${c.landArea} m² de lote` : "excelente lote"}.`,
          `Esta casa en ${t.place} reúne lo que busca una familia: amplitud, buena ubicación y un entorno ${t.vibe}.`,
        ])
      : rng.pick([
          `Se arrienda casa ${t.adj} en ${t.place}, ${t.city}, con ${t.beds} habitaciones y ${t.baths} baños, en un sector ${t.vibe}.`,
          `Arriendo casa de ${t.area} m² en ${t.place}, ideal para familia numerosa o para uso empresarial.`,
        ]),
  );
  const dist = [
    "En el primer piso están la sala, el comedor, la cocina y un baño social; en el segundo, las alcobas con baño propio y estudio.",
    "La distribución es muy funcional: espacios sociales amplios abajo y zona privada arriba, con luz natural en todos los ambientes.",
    "La cocina es integral y se abre a un comedor auxiliar, con zona de ropas independiente y cuarto de servicio.",
    "La alcoba principal cuenta con vestier y baño privado, y el resto de las habitaciones son amplias y ventiladas.",
  ];
  s.push(...rng.shuffle(dist).slice(0, 2));
  const outdoor = [
    "Tiene patio y jardín bien cuidados, ideales para los niños, las mascotas o una tarde de asado.",
    "Cuenta con terraza social y zona BBQ para reunir a la familia.",
    "El antejardín y el patio trasero dan privacidad y espacio para ampliar si lo desea.",
  ];
  s.push(rng.pick(outdoor));
  if (has(c, "conjunto-cerrado") || has(c, "porteria-24h")) s.push(`Está en conjunto cerrado con ${list(amenityPhrase(c, ["porteria-24h", "circuito-de-camaras", "zonas-verdes", "piscina", "salon-comunal"], 3)) || "vigilancia permanente"}.`);
  else s.push("La zona es segura, con vigilancia del sector y vecinos de muchos años.");
  if ((c.parking ?? 0) > 0) s.push(`Tiene ${plural(c.parking!, "parqueadero", "parqueaderos")} y espacio adicional para visitas.`);
  s.push(locationSentence(c, t));
  s.push(termsSentence(c));
  s.push(rng.pick(CLOSERS));
  return s;
}

function finca(c: TextCtx, t: Record<string, string>): string[] {
  const { rng } = c;
  const s: string[] = [];
  s.push(rng.pick([
    `Finca ${t.adj} de ${ha(c.landArea ?? 0)} cerca de ${t.city}, perfecta para descansar en familia o para un proyecto de recreo.`,
    `Vendo finca de recreo con ${t.beds} habitaciones y ${ha(c.landArea ?? 0)} de terreno, en un entorno de montaña y aire puro.`,
  ]));
  s.push(`La casa principal tiene ${t.area} m² construidos, ${t.beds} alcobas, ${t.baths} baños, sala con chimenea y amplios corredores para disfrutar el paisaje.`);
  const extras = amenityPhrase(c, ["piscina", "zona-bbq", "jacuzzi", "zonas-verdes", "vista-panoramica", "planta-electrica"], 4);
  s.push(extras.length ? `Entre sus atractivos están ${list(extras)}, además de kiosco social y zonas de cultivo.` : "Cuenta con kiosco social, zonas de cultivo y senderos para caminar.");
  s.push("El terreno tiene agua propia, árboles frutales y buenos accesos vehiculares, todo en una vía pavimentada hasta la entrada.");
  s.push(`Se ubica en ${t.place}, ${t.city}, con ${t.lm1} a poca distancia y servicios básicos al día.`);
  s.push(termsSentence(c).replace(/, estrato \d/, ""));
  s.push(rng.pick(CLOSERS));
  return s;
}

function lote(c: TextCtx, t: Record<string, string>): string[] {
  const { rng } = c;
  const s: string[] = [];
  s.push(rng.pick([
    `Lote de ${ha(c.area ?? 0)} en ${t.place}, ${t.city}, ideal para construir vivienda, un proyecto de renta o para invertir y valorizar.`,
    `Vendo lote ${rng.pick(["plano", "con leve pendiente", "esquinero"])} de ${ha(c.area ?? 0)} en ${t.place}, un sector ${t.vibe}.`,
  ]));
  s.push("Cuenta con acceso vehicular directo, cerramiento parcial y servicios públicos disponibles en el frente del predio.");
  s.push(rng.pick(["El uso del suelo permite vivienda y comercio de bajo impacto; con gusto compartimos la ficha normativa.", "Tiene licencia de construcción en trámite y estudio de suelos disponible para el comprador.", "La topografía facilita la construcción y se pueden diseñar varias soluciones de vivienda."]));
  s.push(locationSentence(c, t));
  s.push(`${c.negotiable ? "El valor es negociable" : "Escrituras al día, sin gravámenes"}, y se aceptan opciones de pago de contado o con crédito. El predio está libre de hipotecas y listo para escriturar.`);
  s.push(rng.pick(CLOSERS));
  return s;
}

function commercial(c: TextCtx, t: Record<string, string>): string[] {
  const { rng } = c;
  const s: string[] = [];
  const op = c.op === "SALE" ? "Vendo" : "Arriendo";
  switch (c.type) {
    case "local":
      s.push(`${op} local comercial de ${t.area} m² en ${t.place}, ${t.city}, en un sector ${t.vibe} con alto flujo de peatones y vehículos.`);
      s.push(rng.pick(["Tiene fachada amplia con vitrina, piso en cerámica, baño y bodega interna, listo para adecuar según tu negocio.", "El espacio es diáfano, con buena altura y ventilación, ideal para restaurante, tienda, farmacia o servicios."]));
      s.push("Cuenta con instalaciones eléctricas y de gas al día, y la posibilidad de instalar aviso luminoso sobre la fachada.");
      break;
    case "oficina":
      s.push(`${op} oficina de ${t.area} m² en ${t.place}, ${t.city}, en un sector ${t.vibe}, lista para operar.`);
      s.push(rng.pick(["Tiene recepción, área abierta para puestos de trabajo, sala de juntas y cocineta, con excelente iluminación natural.", "La distribución permite varios despachos y una zona de reuniones, con cableado estructurado y aire acondicionado."]));
      s.push(`El edificio cuenta con ${list(["recepción", "ascensores", "vigilancia 24 horas", ...(has(c, "circuito-de-camaras") ? ["circuito cerrado de cámaras"] : [])].slice(0, 4))}.`);
      break;
    case "bodega":
      s.push(`${op} bodega de ${t.area} m² en ${t.place}, ${t.city}, con excelente acceso a las principales vías de la ciudad.`);
      s.push("Tiene altura libre de 8 metros, piso industrial en concreto, muelle de cargue y espacio de maniobra para tractomulas.");
      s.push("Dispone de oficinas administrativas, baños, zona de vigilancia y subestación eléctrica con capacidad para maquinaria.");
      break;
    case "consultorio":
      s.push(`${op} consultorio ${t.adj} de ${t.area} m² en ${t.place}, ${t.city}, cerca de clínicas y centros médicos.`);
      s.push("Cuenta con sala de espera, consultorio principal, baño privado y cocineta, con acabados sobrios y buena insonorización.");
      s.push("Es ideal para odontología, psicología, medicina general u otras especialidades; incluye acceso para personas con movilidad reducida.");
      break;
    default:
      break;
  }
  if ((c.parking ?? 0) > 0) s.push(`Incluye ${plural(c.parking!, "parqueadero", "parqueaderos")}.`);
  s.push(locationSentence(c, t));
  s.push(termsSentence(c).replace(/, estrato \d/, "").replace(/ y se aceptan mascotas/, ""));
  s.push(rng.pick(CLOSERS));
  return s;
}

const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function makeDescription(c: TextCtx): string {
  const t = tokens(c);
  let parts: string[];
  switch (c.type) {
    case "apartamento":
    case "penthouse":
    case "apartaestudio":
      parts = residentialUnit(c, t);
      break;
    case "casa":
      parts = house(c, t);
      break;
    case "finca":
      parts = finca(c, t);
      break;
    case "lote":
      parts = lote(c, t);
      break;
    default:
      parts = commercial(c, t);
  }
  // Ajusta a 90–165 palabras: quita frases intermedias si se pasa, agrega contexto si se queda corta.
  const protectedLast = 2; // condiciones + cierre
  while (wc(parts.join(" ")) > 165 && parts.length > protectedLast + 3) parts.splice(parts.length - protectedLast - 1, 1);
  const fillers = [
    `Es un lugar pensado para disfrutar ${c.op === "SALE" ? "durante muchos años" : "desde el primer día"}, con ${c.place} como un excelente punto de partida.`,
    "Tanto la zona como el inmueble tienen muy buena valorización y demanda constante.",
    "Los vecinos y el entorno hacen que el día a día sea tranquilo y práctico.",
  ];
  let i = 0;
  while (wc(parts.join(" ")) < 92 && i < fillers.length) parts.splice(parts.length - protectedLast, 0, fillers[i++]!);
  return contract(parts.join(" ").replace(/\s+/g, " ").trim());
}

/* ---------- Mensajes de consultas ---------- */
export function inquiryOpening(rng: Rng, title: string, op: "SALE" | "RENT"): string {
  return rng.pick(op === "SALE" ? [
    `Hola, me interesa "${title}". ¿Sigue disponible? ¿Hay posibilidad de negociar el valor?`,
    `Buenas tardes, vi la publicación y me gustaría agendar una visita este fin de semana. ¿Qué horarios tiene?`,
    `Hola, ¿el inmueble tiene escrituras al día y está libre de gravámenes? Estoy interesado en comprarlo con crédito hipotecario.`,
    `Buen día, ¿me puede compartir más fotos y el valor exacto de la administración? Gracias.`,
  ] : [
    `Hola, me interesa "${title}". ¿Sigue disponible? ¿Desde qué fecha se podría entregar?`,
    `Buenas tardes, ¿aceptan mascotas? Tengo un perro pequeño. También quisiera saber si piden codeudor.`,
    `Hola, quisiera visitarlo esta semana. ¿Qué requisitos piden para el contrato de arrendamiento?`,
    `Buen día, ¿el canon incluye la administración? ¿Cuánto es el depósito que se solicita?`,
  ]);
}
export function ownerReply(rng: Rng, name: string): string {
  return rng.pick([
    `Hola ${name}, gracias por escribir. Sí, sigue disponible. Con gusto coordinamos una visita; ¿te sirve el sábado a las 10:00 a. m.?`,
    `Buen día ${name}. El inmueble está disponible. Te cuento que los documentos están al día y podemos hablar de la forma de pago cuando lo conozcas.`,
    `Hola ${name}, claro que sí. Te envío más fotos por aquí. Si te parece, nos vemos en la semana y lo recorremos con calma.`,
  ]);
}
export function inquiryFollowUp(rng: Rng): string {
  return rng.pick([
    "Perfecto, muchas gracias. El sábado a las 10:00 a. m. me sirve, ahí estaré.",
    "Gracias por la respuesta. ¿Podrías confirmarme la dirección exacta y si hay parqueadero para visitantes?",
    "Excelente, quedo atento a las fotos. Gracias.",
  ]);
}
