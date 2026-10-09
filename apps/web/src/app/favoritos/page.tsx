import type { Metadata } from "next";
import { apiServer, getUser } from "@/lib/server";
import type { Catalog } from "@/lib/types";
import { FavoritesGate, FavoritesView } from "@/components/search/favorites-view";

export const metadata: Metadata = { title: "Mis favoritos", description: "Tus inmuebles guardados y tus búsquedas guardadas en Jucaro.", robots: { index: false, follow: false }, alternates: { canonical: "/favoritos" } };

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const sp = await searchParams;
  const user = await getUser();
  if (!user) return <FavoritesGate />;
  const tab = (Array.isArray(sp.tab) ? sp.tab[0] : sp.tab) === "busquedas" ? "busquedas" : "guardados";
  const catalog = await apiServer<Catalog>("/catalog", { revalidate: 300 }).catch(() => null);
  return <FavoritesView initialTab={tab} name={user.name.split(" ")[0] ?? user.name} catalog={catalog} />;
}
