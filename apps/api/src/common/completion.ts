export interface CompletionInput {
  typeId: string | null;
  cityId: string | null;
  price: number;
  title: string;
  description: string;
  readyImages: number;
  hasCover: boolean;
  neighborhoodId: string | null;
  hasLocation: boolean;
  area: number | null;
  amenities: number;
}

export interface CompletionResult {
  percent: number;
  /** Etiquetas de lo que falta para enviar a revisión. */
  missing: string[];
  /** Mismos faltantes por campo (para respuestas 400 del submit). */
  errors: Record<string, string[]>;
}

export const MIN_PHOTOS = 3;
export const MIN_TITLE = 10;
export const MIN_DESCRIPTION = 40;

export function computeCompletion(d: CompletionInput): CompletionResult {
  const missing: string[] = [];
  const errors: Record<string, string[]> = {};
  const miss = (field: string, label: string, message: string) => {
    missing.push(label);
    (errors[field] ??= []).push(message);
  };

  let score = 0;
  if (d.typeId) score += 10;
  else miss("typeId", "Tipo de inmueble", "Selecciona el tipo de inmueble");
  if (d.cityId) score += 10;
  else miss("cityId", "Ciudad", "Selecciona la ciudad");
  if (d.price > 0) score += 10;
  else miss("price", "Precio", "Indica un precio mayor que cero");
  if (d.title.trim().length >= MIN_TITLE) score += 12;
  else miss("title", `Título (mínimo ${MIN_TITLE} caracteres)`, `El título debe tener al menos ${MIN_TITLE} caracteres`);
  if (d.description.trim().length >= MIN_DESCRIPTION) score += 12;
  else miss("description", `Descripción (mínimo ${MIN_DESCRIPTION} caracteres)`, `La descripción debe tener al menos ${MIN_DESCRIPTION} caracteres`);

  score += Math.round((Math.min(d.readyImages, MIN_PHOTOS) / MIN_PHOTOS) * 20);
  if (d.readyImages < MIN_PHOTOS) miss("images", `Al menos ${MIN_PHOTOS} fotos`, `Sube al menos ${MIN_PHOTOS} fotos (tienes ${d.readyImages})`);
  else if (!d.hasCover) miss("images", "Foto de portada", "Elige una foto de portada");

  if (d.neighborhoodId) score += 8;
  if (d.hasLocation) score += 8;
  if (d.area && d.area > 0) score += 6;
  if (d.amenities > 0) score += 4;

  return { percent: Math.min(100, Math.max(0, score)), missing, errors };
}
