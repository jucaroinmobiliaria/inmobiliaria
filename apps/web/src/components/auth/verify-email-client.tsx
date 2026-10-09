"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mutate as globalMutate } from "swr";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { toast } from "@/lib/toast";
import type { SessionUser } from "@/lib/types";
import { FormAlert } from "./login-form";
import { readError } from "./form-utils";
import { landingFor } from "./safe-next";

const inflight = new Map<string, Promise<{ user: SessionUser }>>();

function verifyOnce(key: string, run: () => Promise<{ user: SessionUser }>) {
  let p = inflight.get(key);
  if (!p) {
    p = run().catch((e) => {
      inflight.delete(key);
      throw e;
    });
    inflight.set(key, p);
  }
  return p;
}

type SbCred =
  | { kind: "accessToken"; accessToken: string }
  | { kind: "code"; code: string }
  | { kind: "tokenHash"; tokenHash: string; type: "signup" | "email" | "invite" | "magiclink" | "recovery" | "email_change" };

function readSupabaseCred(): SbCred | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const code = q.get("code");
  if (code) return { kind: "code", code };
  const tokenHash = q.get("token_hash") ?? q.get("tokenHash");
  const typeRaw = (q.get("type") ?? "signup").toLowerCase();
  if (tokenHash) {
    const allowed = ["signup", "email", "invite", "magiclink", "recovery", "email_change"] as const;
    const type = allowed.find((t) => t === typeRaw) ?? "signup";
    return { kind: "tokenHash", tokenHash, type };
  }
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const p = new URLSearchParams(hash);
    const accessToken = p.get("access_token");
    if (accessToken) return { kind: "accessToken", accessToken };
  }
  return null;
}

async function resolveSupabaseAccess(): Promise<SbCred | null> {
  const direct = readSupabaseCred();
  if (direct) return direct;
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  // PKCE: exchangeCodeForSession lee ?code= de la URL actual.
  try {
    const href = window.location.href;
    if (href.includes("code=") || href.includes("access_token=") || href.includes("token_hash=")) {
      const { data, error } = await sb.auth.exchangeCodeForSession(href);
      if (!error && data.session?.access_token) return { kind: "accessToken", accessToken: data.session.access_token };
    }
  } catch { /* seguir con getSession */ }
  const { data } = await sb.auth.getSession();
  if (data.session?.access_token) return { kind: "accessToken", accessToken: data.session.access_token };
  return null;
}

function bodyFromCred(c: SbCred): Record<string, string> {
  if (c.kind === "accessToken") return { accessToken: c.accessToken };
  if (c.kind === "code") return { code: c.code };
  return { tokenHash: c.tokenHash, type: c.type };
}

export function VerifyEmailClient({ token, next }: { token: string | null; next: string | null }) {
  const router = useRouter();
  const { setUser } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [waitingHash, setWaitingHash] = useState(!token);

  useEffect(() => {
    let cancelled = false;

    const finish = async (r: { user: SessionUser }) => {
      if (cancelled) return;
      setUser(r.user);
      await globalMutate("favorites-ids");
      toast.success(`¡Bienvenido a Jucaro, ${r.user.name.split(" ")[0]}!`);
      const path = window.location.pathname + (next ? `?next=${encodeURIComponent(next)}` : "");
      window.history.replaceState(null, "", path);
      router.replace(landingFor(r.user.role, next));
      router.refresh();
    };

    const fail = (err: unknown) => {
      if (cancelled) return;
      const r = readError(err);
      setError(r.fields.token ?? r.form ?? "El enlace no es válido o ya venció. Solicita uno nuevo.");
      setWaitingHash(false);
    };

    if (token) {
      void verifyOnce(`token:${token}`, () => api<{ user: SessionUser }>("/auth/verify-email", { body: { token } }))
        .then(finish)
        .catch(fail);
      return () => { cancelled = true; };
    }

    void (async () => {
      // Dar tiempo a que el hash/PKCE quede en la URL.
      await new Promise((r) => setTimeout(r, 50));
      if (cancelled) return;
      let cred = await resolveSupabaseAccess();
      if (!cred) {
        await new Promise((r) => setTimeout(r, 200));
        if (cancelled) return;
        cred = await resolveSupabaseAccess();
      }
      if (!cred) {
        setWaitingHash(false);
        setError("Falta el código de seguridad. Ábrelo directamente desde el correo que te enviamos (no copies solo la dirección), o vuelve a registrarte.");
        return;
      }
      setWaitingHash(false);
      const key = cred.kind === "accessToken" ? cred.accessToken.slice(0, 24) : cred.kind === "code" ? cred.code.slice(0, 24) : cred.tokenHash.slice(0, 24);
      try {
        await verifyOnce(`sb:${cred.kind}:${key}`, () =>
          api<{ user: SessionUser }>("/auth/verify-supabase", { body: bodyFromCred(cred!) }),
        ).then(finish);
      } catch (e) {
        fail(e);
      }
    })();

    return () => { cancelled = true; };
  }, [token, next, setUser, router]);

  if (error) {
    return (
      <div className="grid gap-4">
        <FormAlert>{error}</FormAlert>
        <div className="flex flex-wrap gap-2.5">
          <Button href="/registro">Volver a registrarte</Button>
          <Link href="/ingresar" className="inline-flex h-11 items-center px-3 text-[15px] font-semibold text-brand-700 hover:underline">Ir a ingresar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3" role="status" aria-live="polite">
      <div className="skeleton h-14 w-full rounded-full" />
      <p className="text-[15px] text-ink-2">{waitingHash ? "Abriendo el enlace de confirmación…" : "Confirmando tu correo…"}</p>
    </div>
  );
}
