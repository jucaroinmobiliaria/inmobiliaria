"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "@/components/ui/icon";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="container-x grid min-h-[calc(100dvh-68px)] place-items-center pb-20 pt-[110px] text-center">
      <div className="max-w-xl">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sun-soft text-sun-ink"><RefreshCw className="h-7 w-7" /></span>
        <p className="eyebrow mb-3 mt-6">Algo no salió bien</p>
        <h1 className="display-lg text-balance">Tropezamos con un <em className="italic">imprevisto</em></h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">No pudimos cargar esta página. Puede ser un problema temporal: inténtalo de nuevo y, si sigue pasando, vuelve en unos minutos.</p>
        {error.digest && <p className="mt-3 text-[12px] text-ink-3">Referencia: {error.digest}</p>}
        <div className="mt-7 flex flex-wrap justify-center gap-3"><Button size="lg" onClick={reset}><RefreshCw className="h-4 w-4" />Reintentar</Button><Button size="lg" variant="outline" href="/">Ir al inicio</Button></div>
      </div>
    </div>
  );
}
