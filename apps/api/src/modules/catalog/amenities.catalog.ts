/** Catálogo canónico de amenidades. Fuente para seed y para el upsert al arrancar la API. */

export type AmenityCat = "INTERIOR" | "BUILDING" | "EXTERIOR" | "SURROUNDINGS";

export const AMENITIES: { slug: string; name: string; icon: string; category: AmenityCat }[] = [
  // Interior — espacios
  { slug: "sala", name: "Sala", icon: "furnished", category: "INTERIOR" },
  { slug: "comedor", name: "Comedor", icon: "kitchen", category: "INTERIOR" },
  { slug: "cocina-integral", name: "Cocina integral", icon: "kitchen", category: "INTERIOR" },
  { slug: "estudio", name: "Estudio", icon: "tv", category: "INTERIOR" },
  { slug: "zona-de-lavanderia", name: "Zona de lavandería", icon: "laundry", category: "INTERIOR" },
  { slug: "cuarto-util", name: "Cuarto útil", icon: "lock", category: "INTERIOR" },
  { slug: "cocineta", name: "Cocineta", icon: "kitchen", category: "INTERIOR" },
  { slug: "deposito", name: "Depósito", icon: "warehouse", category: "INTERIOR" },
  { slug: "recepcion", name: "Recepción", icon: "users", category: "INTERIOR" },
  { slug: "sala-de-juntas", name: "Sala de juntas", icon: "office", category: "INTERIOR" },
  { slug: "vitrina", name: "Vitrina", icon: "store", category: "INTERIOR" },
  // Interior — instalaciones
  { slug: "chimenea", name: "Chimenea", icon: "fireplace", category: "INTERIOR" },
  { slug: "aire-acondicionado", name: "Aire acondicionado", icon: "ac", category: "INTERIOR" },
  { slug: "gas-natural", name: "Gas natural", icon: "zap", category: "INTERIOR" },
  // Edificio / conjunto
  { slug: "piscina", name: "Piscina", icon: "pool", category: "BUILDING" },
  { slug: "gimnasio", name: "Gimnasio", icon: "gym", category: "BUILDING" },
  { slug: "porteria-24h", name: "Portería 24 h", icon: "security", category: "BUILDING" },
  { slug: "ascensor", name: "Ascensor", icon: "elevator", category: "BUILDING" },
  { slug: "salon-comunal", name: "Salón comunal", icon: "social", category: "BUILDING" },
  { slug: "juegos-infantiles", name: "Juegos infantiles", icon: "kids", category: "BUILDING" },
  { slug: "parqueadero-de-visitantes", name: "Parqueadero de visitantes", icon: "lock", category: "BUILDING" },
  { slug: "circuito-de-camaras", name: "Circuito de cámaras", icon: "cctv", category: "BUILDING" },
  { slug: "planta-electrica", name: "Planta eléctrica", icon: "zap", category: "BUILDING" },
  { slug: "conjunto-cerrado", name: "Conjunto cerrado", icon: "lock", category: "BUILDING" },
  // Exterior — espacios
  { slug: "balcon", name: "Balcón", icon: "balcony", category: "EXTERIOR" },
  { slug: "terraza", name: "Terraza", icon: "terrace", category: "EXTERIOR" },
  { slug: "patio", name: "Patio", icon: "garden", category: "EXTERIOR" },
  { slug: "jardin", name: "Jardín", icon: "garden", category: "EXTERIOR" },
  { slug: "kiosco", name: "Kiosco", icon: "sun", category: "EXTERIOR" },
  { slug: "zona-bbq", name: "Zona BBQ", icon: "sun", category: "EXTERIOR" },
  { slug: "zonas-verdes", name: "Zonas verdes", icon: "garden", category: "EXTERIOR" },
  { slug: "jacuzzi", name: "Jacuzzi", icon: "water", category: "EXTERIOR" },
  { slug: "vista-panoramica", name: "Vista panorámica", icon: "view", category: "EXTERIOR" },
  { slug: "mascotas-permitidas", name: "Mascotas permitidas", icon: "pets", category: "EXTERIOR" },
  // Lote
  { slug: "acueducto", name: "Acueducto", icon: "water", category: "EXTERIOR" },
  { slug: "energia-electrica", name: "Energía eléctrica", icon: "zap", category: "EXTERIOR" },
  { slug: "alcantarillado", name: "Alcantarillado", icon: "tools", category: "EXTERIOR" },
  { slug: "lote-cerrado", name: "Lote cerrado", icon: "fence", category: "EXTERIOR" },
  { slug: "esquinero", name: "Esquinero", icon: "land", category: "EXTERIOR" },
  { slug: "via-pavimentada", name: "Vía pavimentada", icon: "car", category: "EXTERIOR" },
  { slug: "lote-plano", name: "Lote plano", icon: "land", category: "EXTERIOR" },
  // Alrededores
  { slug: "cerca-de-transporte", name: "Cerca de transporte", icon: "bus", category: "SURROUNDINGS" },
  { slug: "cerca-de-colegios", name: "Cerca de colegios", icon: "school", category: "SURROUNDINGS" },
  { slug: "cerca-de-centros-comerciales", name: "Cerca de centros comerciales", icon: "shopping", category: "SURROUNDINGS" },
  { slug: "cerca-de-parques", name: "Cerca de parques", icon: "park", category: "SURROUNDINGS" },
  { slug: "cerca-de-hospitales", name: "Cerca de hospitales", icon: "hospital", category: "SURROUNDINGS" },
  { slug: "barrio-caminable", name: "Barrio caminable", icon: "walk", category: "SURROUNDINGS" },
];
