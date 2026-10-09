import type { Catalog, CatalogCity, CatalogType, DraftDTO, DraftInput, SessionUser } from "@/lib/types";
import type { TypeTraits } from "./steps";

/** Lo que reciben los pasos del asistente. */
export interface StepProps {
  draft: DraftDTO;
  catalog: Catalog;
  user: SessionUser;
  onUserChange?: (u: SessionUser) => void;
  update: (patch: DraftInput) => void;
  /** Mensajes por campo (validación del paso + rechazos del servidor). Vacío hasta que el usuario intenta continuar. */
  errors: Record<string, string>;
  traits: TypeTraits;
  type?: CatalogType;
  city?: CatalogCity;
  go: (n: number) => void;
}
