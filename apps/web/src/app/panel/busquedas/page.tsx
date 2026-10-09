import type { Metadata } from "next";
import { SavedSearches } from "@/components/panel/saved-searches";

export const metadata: Metadata = { title: "Búsquedas guardadas" };

export default function Page() {
  return <SavedSearches />;
}
