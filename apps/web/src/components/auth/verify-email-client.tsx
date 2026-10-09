"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mutate as globalMutate } from "swr";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { SessionUser } from "@/lib/types";
import { FormAlert } from "./login-form";
import { readError } from "./form-utils";
import { landingFor } from "./safe-next";

const inflight = new Map<string, Promise<{ user: SessionUser }>>();

function verifyOnce(token: string) {
  let p = inflight.get(token);
  if (!p) {
    p = api<{ user: SessionUser }>("/auth/verify-email", { body: { token } }).catch((e) => {
      inflight.delete(token);
      throw e;
    });
    inflight.set(token, p);
  }
  return p;
}

export function VerifyEmailClient({ token, next }: { token: string; next: string | null }) {
  const router = useRouter();
  const { setUser } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    verifyOnce(token)
      .then(async (r) => {
        if (cancelled) return;
        setUser(r.user);
        await globalMutate("favorites-ids");
        toast.success(`¡Bienvenido a Jucaro, ${r.user.name.split(" ")[0]}!`);
        router.replace(landingFor(r.user.role, next));
        router.refresh();
      })
      .catch((err) => {
        if (cancelled) return;
        const r = readError(err);
        setError(r.fields.token ?? r.form ?? "El enlace no es válido o ya venció. Solicita uno nuevo.");
      });
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
      <p className="text-[15px] text-ink-2">Confirmando tu correo…</p>
    </div>
  );
}
