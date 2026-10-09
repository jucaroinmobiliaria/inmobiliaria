/** Fotografías de la interfaz (portada, categorías). Unsplash, libres de uso. Con respaldo visual si fallan. */
const u = (id: string, w = 2000) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const HERO_IMAGES = [
  { src: u("1600596542815-ffad4c1539a9"), alt: "Casa moderna con piscina al atardecer", place: "Casa campestre · Llanogrande" },
  { src: u("1600585154340-be6161a56a0c"), alt: "Fachada de casa moderna con jardín", place: "Casa · Envigado" },
  { src: u("1502672260266-1c1ef2d93688"), alt: "Sala luminosa de apartamento", place: "Apartamento · El Poblado" },
  { src: u("1613490493576-7fde63acd811"), alt: "Casa de lujo con vista", place: "Penthouse · Laureles" },
];

export const CATEGORY_IMAGES: Record<string, string> = {
  apartamento: u("1545324418-cc1a3fa10c00", 900),
  casa: u("1564013799919-ab600027ffc6", 900),
  finca: u("1518780664697-55e3ad937233", 900),
  oficina: u("1497366216548-37526070297c", 900),
  local: u("1604328698692-f76ea9498e76", 900),
  lote: u("1500382017468-9049fed747ef", 900),
};

export const CITY_IMAGES: Record<string, string> = {
  medellin: u("1599413181490-6ee73c9c31c6", 1200),
  bogota: u("1568632234157-ce7aecd03d0d", 1200),
  cali: u("1559494007-9f5847c49d94", 1200),
  cartagena: u("1583997052103-b4a1cb974ce5", 1200),
  barranquilla: u("1500382017468-9049fed747ef", 1200),
  "santa-marta": u("1507525428034-b723cf961d3e", 1200),
};

export const PUBLISH_BAND_IMAGE = u("1560448204-e02f11c3d0e2", 1600);
