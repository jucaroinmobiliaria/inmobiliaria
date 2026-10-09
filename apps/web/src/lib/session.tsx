"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useRouter } from "next/navigation";
import { api, ApiException } from "./api";
import type { SessionUser } from "./types";

type RegisterInput = { name: string; email: string; password: string; phone?: string; role?: "USER" | "OWNER" | "AGENT" };
type Ctx = {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  register: (input: RegisterInput) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: SessionUser | null) => void;
};

const SessionContext = createContext<Ctx | null>(null);

async function fetchMe(): Promise<SessionUser | null> {
  try {
    return (await api<{ user: SessionUser }>("/auth/me")).user;
  } catch (e) {
    if (e instanceof ApiException && e.status === 401) return null;
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate } = useSWR<SessionUser | null>("session", fetchMe, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const router = useRouter();

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ user: SessionUser }>("/auth/login", { body: { email, password } });
    await mutate(r.user, { revalidate: false });
    await globalMutate("favorites-ids");
    router.refresh();
    return r.user;
  }, [mutate, router]);

  const register = useCallback(async (input: RegisterInput) => {
    const r = await api<{ user: SessionUser }>("/auth/register", { body: input });
    await mutate(r.user, { revalidate: false });
    router.refresh();
    return r.user;
  }, [mutate, router]);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => null);
    await mutate(null, { revalidate: false });
    await globalMutate("favorites-ids", { ids: [] }, { revalidate: false });
    router.push("/");
    router.refresh();
  }, [mutate, router]);

  const value = useMemo<Ctx>(() => ({
    user: data ?? null,
    loading: isLoading,
    login, register, logout,
    refresh: async () => { await mutate(); },
    setUser: (u) => { void mutate(u, { revalidate: false }); },
  }), [data, isLoading, login, register, logout, mutate]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
