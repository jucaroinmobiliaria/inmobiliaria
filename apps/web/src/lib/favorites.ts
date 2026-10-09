"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { usePathname, useRouter } from "next/navigation";
import { api } from "./api";
import { useSession } from "./session";
import { toast } from "./toast";

/** Ids de favoritos del usuario. Las tarjetas de páginas cacheadas (ISR) pintan el corazón con esto. */
export function useFavorites() {
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { data, mutate } = useSWR<{ ids: string[] }>(
    user ? "favorites-ids" : null,
    () => api<{ ids: string[] }>("/favorites/ids"),
    { revalidateOnFocus: false },
  );
  const ids = data?.ids;

  const isFavorite = useCallback((id: string) => !!ids?.includes(id), [ids]);

  const toggle = useCallback(async (id: string) => {
    if (!user) {
      toast.info("Inicia sesión para guardar tus favoritos");
      router.push(`/ingresar?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const was = !!ids?.includes(id);
    await mutate(
      async () => {
        await api(`/favorites/${id}`, { method: was ? "DELETE" : "PUT" });
        return { ids: was ? (ids ?? []).filter((x) => x !== id) : [...(ids ?? []), id] };
      },
      { optimisticData: { ids: was ? (ids ?? []).filter((x) => x !== id) : [...(ids ?? []), id] }, rollbackOnError: true, revalidate: false },
    ).catch(() => toast.error("No pudimos actualizar tus favoritos"));
    if (!was) toast.success("Guardado en favoritos");
  }, [user, ids, mutate, router, pathname]);

  return { isFavorite, toggle, count: ids?.length ?? 0 };
}
