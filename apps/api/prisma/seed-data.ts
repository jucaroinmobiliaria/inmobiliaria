/** Datos base de la semilla: catálogos, ciudades con coordenadas reales, usuarios y el plan de publicaciones. */

export type TypeSlug =
  | "apartamento" | "casa" | "apartaestudio" | "penthouse" | "finca" | "lote" | "local" | "oficina" | "bodega" | "consultorio";

export const TYPES: { slug: TypeSlug; name: string; pluralName: string; icon: string; group: string }[] = [
  { slug: "apartamento", name: "Apartamento", pluralName: "Apartamentos", icon: "apartment", group: "residential" },
  { slug: "casa", name: "Casa", pluralName: "Casas", icon: "house", group: "residential" },
  { slug: "apartaestudio", name: "Apartaestudio", pluralName: "Apartaestudios", icon: "apartment", group: "residential" },
  { slug: "penthouse", name: "Penthouse", pluralName: "Penthouses", icon: "building", group: "residential" },
  { slug: "finca", name: "Finca", pluralName: "Fincas", icon: "farm", group: "rural" },
  { slug: "lote", name: "Lote", pluralName: "Lotes", icon: "land", group: "land" },
  { slug: "local", name: "Local comercial", pluralName: "Locales comerciales", icon: "store", group: "commercial" },
  { slug: "oficina", name: "Oficina", pluralName: "Oficinas", icon: "office", group: "commercial" },
  { slug: "bodega", name: "Bodega", pluralName: "Bodegas", icon: "warehouse", group: "commercial" },
  { slug: "consultorio", name: "Consultorio", pluralName: "Consultorios", icon: "building", group: "commercial" },
];

export type { AmenityCat } from "../src/modules/catalog/amenities.catalog.ts";
export { AMENITIES } from "../src/modules/catalog/amenities.catalog.ts";

export type CityKey = "medellin" | "bogota" | "cali" | "cartagena" | "barranquilla" | "santa-marta";

export interface HoodSeed {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  /** Precio de venta por m² (COP) de referencia. */
  ppm2: number;
  stratum: [number, number];
  landmarks: string[];
  vibe: string;
}
export interface CitySeed {
  slug: CityKey;
  name: string;
  department: string;
  lat: number;
  lng: number;
  /** Clima cálido: favorece aire acondicionado. */
  hot: boolean;
  hoods: HoodSeed[];
}

export const CITIES: CitySeed[] = [
  {
    slug: "medellin", name: "Medellín", department: "Antioquia", lat: 6.2442, lng: -75.5812, hot: false,
    hoods: [
      { slug: "el-poblado", name: "El Poblado", lat: 6.2086, lng: -75.5659, ppm2: 9_500_000, stratum: [5, 6], landmarks: ["el Parque Lleras", "Provenza", "el Centro Comercial Santafé", "la Milla de Oro"], vibe: "dinámico, con excelente vida gastronómica" },
      { slug: "laureles", name: "Laureles", lat: 6.2476, lng: -75.59, ppm2: 6_500_000, stratum: [4, 5], landmarks: ["la Primera de Laureles", "la Avenida Nutibara", "el Segundo Parque de Laureles", "La 70"], vibe: "residencial, arbolado y muy caminable" },
      { slug: "envigado", name: "Envigado", lat: 6.1759, lng: -75.5917, ppm2: 6_000_000, stratum: [4, 5], landmarks: ["el Parque Principal de Envigado", "Viva Envigado", "la zona rosa de Envigado"], vibe: "familiar y tranquilo" },
      { slug: "belen", name: "Belén", lat: 6.2325, lng: -75.6103, ppm2: 4_200_000, stratum: [3, 4], landmarks: ["el Parque de Belén", "el Centro Comercial Los Molinos", "la Avenida 80"], vibe: "tradicional, con todo a la mano" },
      { slug: "sabaneta", name: "Sabaneta", lat: 6.1515, lng: -75.6165, ppm2: 5_000_000, stratum: [4, 5], landmarks: ["el Parque Principal de Sabaneta", "el Centro Comercial Mayorca"], vibe: "en crecimiento y de ambiente de pueblo" },
      { slug: "estadio", name: "Estadio", lat: 6.2565, lng: -75.5885, ppm2: 5_500_000, stratum: [4, 5], landmarks: ["el Estadio Atanasio Girardot", "la Unidad Deportiva", "la estación Estadio del Metro"], vibe: "céntrico y bien conectado" },
    ],
  },
  {
    slug: "bogota", name: "Bogotá", department: "Bogotá D.C.", lat: 4.711, lng: -74.0721, hot: false,
    hoods: [
      { slug: "chico", name: "Chicó", lat: 4.6745, lng: -74.0495, ppm2: 11_000_000, stratum: [5, 6], landmarks: ["el Centro Andino", "la Zona T", "el Parque de la 93"], vibe: "exclusivo y muy seguro" },
      { slug: "usaquen", name: "Usaquén", lat: 4.7105, lng: -74.031, ppm2: 8_000_000, stratum: [4, 6], landmarks: ["el Parque de Usaquén", "Hacienda Santa Bárbara", "el Mercado de las Pulgas"], vibe: "con aire de pueblo dentro de la ciudad" },
      { slug: "chapinero", name: "Chapinero", lat: 4.6486, lng: -74.0628, ppm2: 9_000_000, stratum: [4, 6], landmarks: ["la Zona G", "la Zona T", "la Carrera 13"], vibe: "vibrante y cerca de todo" },
      { slug: "cedritos", name: "Cedritos", lat: 4.724, lng: -74.043, ppm2: 6_500_000, stratum: [4, 5], landmarks: ["el Centro Comercial Cedritos", "la Autopista Norte"], vibe: "residencial y bien dotado de servicios" },
      { slug: "suba", name: "Suba", lat: 4.7416, lng: -74.0826, ppm2: 4_800_000, stratum: [3, 4], landmarks: ["el Centro Comercial Subazar", "el Humedal La Conejera", "Plaza Imperial"], vibe: "amplio y familiar" },
      { slug: "teusaquillo", name: "Teusaquillo", lat: 4.6355, lng: -74.07, ppm2: 6_000_000, stratum: [3, 5], landmarks: ["el Parque Simón Bolívar", "la Universidad Nacional", "Corferias"], vibe: "tradicional, cultural y arbolado" },
    ],
  },
  {
    slug: "cali", name: "Cali", department: "Valle del Cauca", lat: 3.4516, lng: -76.532, hot: true,
    hoods: [
      { slug: "ciudad-jardin", name: "Ciudad Jardín", lat: 3.375, lng: -76.53, ppm2: 6_500_000, stratum: [5, 6], landmarks: ["el Centro Comercial Jardín Plaza", "la Universidad Icesi"], vibe: "moderno y verde" },
      { slug: "san-fernando", name: "San Fernando", lat: 3.433, lng: -76.54, ppm2: 5_000_000, stratum: [4, 5], landmarks: ["la Avenida Colombia", "el Gato del Río", "la Calle Quinta"], vibe: "bohemio y bien ubicado" },
      { slug: "granada", name: "Granada", lat: 3.4586, lng: -76.5337, ppm2: 5_200_000, stratum: [4, 5], landmarks: ["la Avenida 9 Norte", "la zona gastronómica de Granada", "Chipichape"], vibe: "gastronómico y muy caminable" },
      { slug: "pance", name: "Pance", lat: 3.33, lng: -76.545, ppm2: 5_800_000, stratum: [5, 6], landmarks: ["el río Pance", "el Club Campestre", "la Universidad Javeriana"], vibe: "campestre, rodeado de naturaleza" },
      { slug: "normandia", name: "Normandía", lat: 3.453, lng: -76.544, ppm2: 4_300_000, stratum: [3, 4], landmarks: ["la Calle Quinta", "las principales vías de la zona"], vibe: "tradicional y bien conectado" },
    ],
  },
  {
    slug: "cartagena", name: "Cartagena", department: "Bolívar", lat: 10.3997, lng: -75.5144, hot: true,
    hoods: [
      { slug: "bocagrande", name: "Bocagrande", lat: 10.4018, lng: -75.5578, ppm2: 10_000_000, stratum: [5, 6], landmarks: ["la Avenida San Martín", "las playas de Bocagrande", "el Centro de Convenciones"], vibe: "turístico y frente al mar" },
      { slug: "manga", name: "Manga", lat: 10.411, lng: -75.54, ppm2: 6_000_000, stratum: [4, 5], landmarks: ["el Club de Pesca", "la Calle Real de Manga", "el Cerro de la Popa"], vibe: "tradicional y con casas republicanas" },
      { slug: "castillogrande", name: "Castillogrande", lat: 10.3935, lng: -75.5585, ppm2: 12_000_000, stratum: [6, 6], landmarks: ["el Malecón de Castillogrande", "el Club Naval", "las playas de Castillogrande"], vibe: "exclusivo y tranquilo" },
      { slug: "centro-historico", name: "Centro Histórico", lat: 10.4236, lng: -75.551, ppm2: 11_000_000, stratum: [5, 6], landmarks: ["la Torre del Reloj", "la Plaza de Santo Domingo", "las murallas", "Getsemaní"], vibe: "colonial y lleno de historia" },
      { slug: "crespo", name: "Crespo", lat: 10.445, lng: -75.512, ppm2: 5_500_000, stratum: [4, 5], landmarks: ["el aeropuerto Rafael Núñez", "la Avenida Santander", "la playa de Crespo"], vibe: "frente al mar y de rápido acceso" },
    ],
  },
  {
    slug: "barranquilla", name: "Barranquilla", department: "Atlántico", lat: 10.9685, lng: -74.7813, hot: true,
    hoods: [
      { slug: "alto-prado", name: "Alto Prado", lat: 10.9945, lng: -74.8005, ppm2: 6_500_000, stratum: [5, 6], landmarks: ["el Centro Comercial Buenavista", "el Country Club"], vibe: "residencial y exclusivo" },
      { slug: "el-prado", name: "El Prado", lat: 10.9879, lng: -74.7945, ppm2: 5_500_000, stratum: [4, 6], landmarks: ["el Hotel El Prado", "la Carrera 54"], vibe: "histórico y de casonas" },
      { slug: "riomar", name: "Riomar", lat: 11.012, lng: -74.824, ppm2: 7_500_000, stratum: [5, 6], landmarks: ["el Malecón del Río", "el Parque Sagrado Corazón"], vibe: "moderno, con vista al río" },
      { slug: "villa-country", name: "Villa Country", lat: 11.004, lng: -74.82, ppm2: 5_500_000, stratum: [5, 6], landmarks: ["la Universidad del Norte", "la Circunvalar"], vibe: "campestre y de conjuntos cerrados" },
      { slug: "ciudad-jardin", name: "Ciudad Jardín", lat: 10.998, lng: -74.826, ppm2: 5_000_000, stratum: [4, 5], landmarks: ["el Centro Comercial Buenavista", "la Circunvalar"], vibe: "familiar y bien conectado" },
    ],
  },
  {
    slug: "santa-marta", name: "Santa Marta", department: "Magdalena", lat: 11.2408, lng: -74.199, hot: true,
    hoods: [
      { slug: "el-rodadero", name: "El Rodadero", lat: 11.2036, lng: -74.228, ppm2: 8_000_000, stratum: [4, 6], landmarks: ["la playa de El Rodadero", "el aeropuerto Simón Bolívar", "la zona de restaurantes de la Carrera Segunda"], vibe: "turístico y a pasos de la playa" },
      { slug: "bello-horizonte", name: "Bello Horizonte", lat: 11.208, lng: -74.22, ppm2: 6_000_000, stratum: [4, 5], landmarks: ["la bahía de Santa Marta", "la Troncal del Caribe"], vibe: "tranquilo, con brisa de mar" },
      { slug: "pozos-colorados", name: "Pozos Colorados", lat: 11.19, lng: -74.23, ppm2: 9_000_000, stratum: [5, 6], landmarks: ["la playa de Pozos Colorados", "la Sierra Nevada", "la Marina Internacional"], vibe: "exclusivo, entre el mar y la montaña" },
      { slug: "centro", name: "Centro", lat: 11.242, lng: -74.211, ppm2: 5_000_000, stratum: [3, 5], landmarks: ["el Parque de los Novios", "la Catedral", "el Malecón"], vibe: "histórico y comercial" },
    ],
  },
];

/* ---------- Usuarios ---------- */
export type UserKey = "admin" | "prop" | "ag" | "usr" | "and" | "mar" | "san" | "val" | "car" | "dan";
export interface UserSeed {
  key: UserKey;
  email: string;
  name: string;
  role: "USER" | "AGENT" | "OWNER" | "ADMIN";
  verified: boolean;
  phone: string | null;
  whatsapp?: string;
  city?: string;
  company?: string;
  agency?: string;
  bio?: string;
  website?: string;
  displayName?: string;
}
export const USERS: UserSeed[] = [
  { key: "admin", email: "admin@nido.co", name: "Admin Nido", role: "ADMIN", verified: true, phone: "+57 601 5550100", city: "Bogotá" },
  { key: "prop", email: "propietario@nido.co", name: "Camila Restrepo", role: "OWNER", verified: false, phone: "+57 300 612 4455", whatsapp: "+57 300 612 4455", city: "Medellín", bio: "Propietaria en Medellín. Cuido mis inmuebles como si fueran un hogar y respondo rápido." },
  { key: "ag", email: "agente@nido.co", name: "Julián Ortega", role: "AGENT", verified: true, phone: "+57 310 247 9086", whatsapp: "+57 310 247 9086", city: "Medellín", company: "Inmobiliaria Andes", agency: "Inmobiliaria Andes", bio: "Asesor inmobiliario con 9 años de experiencia en El Poblado, Laureles y el sur del Valle de Aburrá.", website: "https://inmobiliariaandes.example.com" },
  { key: "usr", email: "usuario@nido.co", name: "Laura Gómez", role: "USER", verified: false, phone: "+57 315 880 2231", city: "Medellín" },
  { key: "and", email: "andres.cardenas@nido.co", name: "Andrés Felipe Cárdenas", role: "OWNER", verified: true, phone: "+57 312 455 7810", whatsapp: "+57 312 455 7810", city: "Bogotá", bio: "Propietario en Bogotá. Arriendo y vendo directamente, sin intermediarios." },
  { key: "mar", email: "mariafernanda.londono@nido.co", name: "María Fernanda Londoño", role: "AGENT", verified: true, phone: "+57 320 118 9345", whatsapp: "+57 320 118 9345", city: "Bogotá", company: "Hábitat Capital", agency: "Hábitat Capital", bio: "Especialista en inmuebles comerciales y de vivienda en el norte de Bogotá.", website: "https://habitatcapital.example.com" },
  { key: "san", email: "santiago.valencia@nido.co", name: "Santiago Valencia Ruiz", role: "AGENT", verified: true, phone: "+57 316 903 4477", whatsapp: "+57 316 903 4477", city: "Cali", company: "Casas del Valle", agency: "Casas del Valle", bio: "Agente inmobiliario en Cali. Conozco cada rincón de Pance, Ciudad Jardín y el norte de la ciudad.", website: "https://casasdelvalle.example.com" },
  { key: "val", email: "valentina.pombo@nido.co", name: "Valentina Pombo", role: "OWNER", verified: false, phone: "+57 301 774 2290", whatsapp: "+57 301 774 2290", city: "Cartagena", bio: "Propietaria en Cartagena y Santa Marta." },
  { key: "car", email: "carlosmario.echeverri@nido.co", name: "Carlos Mario Echeverri", role: "AGENT", verified: true, phone: "+57 318 621 5504", whatsapp: "+57 318 621 5504", city: "Barranquilla", company: "Costa Inmuebles", agency: "Costa Inmuebles", bio: "Asesor en la Costa Caribe: Barranquilla, Cartagena y Santa Marta.", website: "https://costainmuebles.example.com" },
  { key: "dan", email: "daniela.ospina@nido.co", name: "Daniela Ospina", role: "OWNER", verified: false, phone: "+57 304 330 1872", whatsapp: "+57 304 330 1872", city: "Barranquilla", bio: "Propietaria en Barranquilla y Santa Marta." },
];

export const AGENCIES = [
  { name: "Inmobiliaria Andes", slug: "inmobiliaria-andes", description: "Más de 12 años acompañando a familias y empresas en la compra, venta y arriendo de inmuebles en el Valle de Aburrá.", phone: "+57 604 444 0101", website: "https://inmobiliariaandes.example.com", verified: true },
  { name: "Hábitat Capital", slug: "habitat-capital", description: "Asesoría integral en inmuebles residenciales y comerciales en Bogotá.", phone: "+57 601 555 0188", website: "https://habitatcapital.example.com", verified: true },
  { name: "Casas del Valle", slug: "casas-del-valle", description: "Inmobiliaria caleña especializada en vivienda campestre y zonas de expansión.", phone: "+57 602 380 0145", website: "https://casasdelvalle.example.com", verified: true },
  { name: "Costa Inmuebles", slug: "costa-inmuebles", description: "Tu aliado inmobiliario en el Caribe colombiano.", phone: "+57 605 360 0123", website: "https://costainmuebles.example.com", verified: true },
];

/* ---------- Plan de publicaciones (64) ---------- */
export type PubStatus = "PUBLISHED" | "PENDING_REVIEW" | "DRAFT" | "PAUSED" | "REJECTED" | "SOLD";
export interface PlanRow {
  owner: UserKey;
  city: CityKey;
  hood: string | null;
  type: TypeSlug;
  op: "SALE" | "RENT";
  status?: PubStatus;
  /** Días desde la publicación. */
  ago?: number;
  featured?: boolean;
  drop?: number; // número de rebajas de precio (0-2)
  note?: string;
}

const P = (owner: UserKey, city: CityKey, hood: string | null, type: TypeSlug, op: "SALE" | "RENT", ago: number, extra: Partial<PlanRow> = {}): PlanRow => ({ owner, city, hood, type, op, status: "PUBLISHED", ago, ...extra });

export const PLAN: PlanRow[] = [
  // Medellín · propietario@nido.co (10)
  P("prop", "medellin", "el-poblado", "apartamento", "SALE", 3, { featured: true }),
  P("prop", "medellin", "laureles", "apartamento", "RENT", 21),
  P("prop", "medellin", "envigado", "casa", "SALE", 40, { drop: 1 }),
  P("prop", "medellin", "el-poblado", "apartaestudio", "RENT", 9),
  P("prop", "medellin", "laureles", "local", "RENT", 0, { status: "PENDING_REVIEW" }),
  P("prop", "medellin", "sabaneta", "apartamento", "SALE", 0, { status: "DRAFT", note: "casi-completo" }),
  P("prop", "medellin", null, "casa", "SALE", 0, { status: "DRAFT", note: "minimo" }),
  P("prop", "medellin", "estadio", "apartamento", "SALE", 55, { status: "PAUSED" }),
  P("prop", "medellin", "belen", "apartamento", "SALE", 0, { status: "REJECTED" }),
  P("prop", "medellin", "laureles", "apartamento", "SALE", 70, { status: "SOLD", drop: 1 }),
  // Medellín · agente@nido.co (6)
  P("ag", "medellin", "el-poblado", "penthouse", "SALE", 12, { featured: true }),
  P("ag", "medellin", "laureles", "apartamento", "SALE", 28),
  P("ag", "medellin", "sabaneta", "apartamento", "RENT", 6),
  P("ag", "medellin", "belen", "bodega", "RENT", 33),
  P("ag", "medellin", null, "finca", "SALE", 47, { featured: true }),
  P("ag", "medellin", "estadio", "oficina", "RENT", 15),
  // Bogotá (11)
  P("ag", "bogota", "chico", "apartamento", "SALE", 8, { featured: true }),
  P("ag", "bogota", "usaquen", "apartamento", "RENT", 19),
  P("and", "bogota", "cedritos", "apartamento", "SALE", 26, { drop: 1 }),
  P("and", "bogota", "suba", "casa", "SALE", 52),
  P("and", "bogota", "teusaquillo", "apartamento", "RENT", 4),
  P("and", "bogota", "chapinero", "apartaestudio", "RENT", 36),
  P("and", "bogota", "usaquen", "casa", "SALE", 61),
  P("mar", "bogota", "chico", "oficina", "RENT", 11),
  P("mar", "bogota", "chapinero", "local", "SALE", 42),
  P("mar", "bogota", "cedritos", "consultorio", "RENT", 23),
  P("mar", "bogota", "suba", "finca", "SALE", 70),
  // Cali (10)
  P("san", "cali", "ciudad-jardin", "apartamento", "SALE", 7, { featured: true }),
  P("san", "cali", "pance", "casa", "SALE", 30, { drop: 2 }),
  P("san", "cali", "san-fernando", "apartamento", "RENT", 14),
  P("san", "cali", "granada", "local", "RENT", 48),
  P("san", "cali", "normandia", "apartamento", "SALE", 18),
  P("san", "cali", "pance", "finca", "SALE", 58),
  P("san", "cali", "ciudad-jardin", "penthouse", "SALE", 35),
  P("san", "cali", "granada", "apartaestudio", "RENT", 2),
  P("san", "cali", "normandia", "casa", "RENT", 66),
  P("san", "cali", "pance", "lote", "SALE", 80),
  // Cartagena (8)
  P("val", "cartagena", "bocagrande", "apartamento", "SALE", 10, { featured: true }),
  P("val", "cartagena", "castillogrande", "apartamento", "SALE", 27),
  P("val", "cartagena", "centro-historico", "apartamento", "RENT", 5),
  P("val", "cartagena", "manga", "casa", "SALE", 44, { drop: 1 }),
  P("val", "cartagena", "bocagrande", "apartamento", "RENT", 16),
  P("car", "cartagena", "crespo", "lote", "SALE", 62),
  P("car", "cartagena", "centro-historico", "local", "RENT", 31),
  P("car", "cartagena", "castillogrande", "penthouse", "SALE", 20, { featured: true }),
  // Barranquilla (10)
  P("car", "barranquilla", "alto-prado", "apartamento", "SALE", 9),
  P("car", "barranquilla", "riomar", "apartamento", "SALE", 24, { featured: true }),
  P("car", "barranquilla", "villa-country", "casa", "SALE", 38),
  P("car", "barranquilla", "el-prado", "oficina", "RENT", 13),
  P("car", "barranquilla", "ciudad-jardin", "bodega", "RENT", 54),
  P("car", "barranquilla", "alto-prado", "consultorio", "SALE", 46),
  P("dan", "barranquilla", "riomar", "apartamento", "RENT", 1),
  P("dan", "barranquilla", "el-prado", "casa", "RENT", 29),
  P("dan", "barranquilla", "villa-country", "apartamento", "SALE", 57, { drop: 1 }),
  P("dan", "barranquilla", "ciudad-jardin", "lote", "SALE", 75),
  // Santa Marta (9)
  P("car", "santa-marta", "el-rodadero", "apartamento", "SALE", 6, { featured: true }),
  P("car", "santa-marta", "el-rodadero", "apartamento", "RENT", 17),
  P("car", "santa-marta", "pozos-colorados", "casa", "SALE", 41),
  P("car", "santa-marta", "bello-horizonte", "apartamento", "SALE", 25),
  P("car", "santa-marta", "centro", "local", "RENT", 51),
  P("dan", "santa-marta", "pozos-colorados", "lote", "SALE", 64),
  P("dan", "santa-marta", "el-rodadero", "apartaestudio", "RENT", 8),
  P("val", "santa-marta", "bello-horizonte", "casa", "SALE", 37),
  P("val", "santa-marta", "centro", "apartamento", "RENT", 22),
];
