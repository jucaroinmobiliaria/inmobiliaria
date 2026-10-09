import { Logo } from "@/components/layout/logo";

/** Esqueleto con la misma estructura del asistente: sin saltos al cargar. */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white" aria-busy="true" aria-label="Cargando el asistente">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4 md:px-8">
        <Logo />
        <div className="skeleton h-9 w-32 rounded-full" />
      </header>
      <div className="mx-auto grid w-full max-w-[1480px] flex-1 gap-12 px-4 py-10 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[200px_minmax(0,1fr)_360px]">
        <div className="hidden gap-3 xl:grid xl:content-start">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-8" />)}</div>
        <div className="mx-auto w-full max-w-[720px]">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton mt-4 h-12 w-3/4" />
          <div className="skeleton mt-3 h-5 w-1/2" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-44 rounded-[24px]" />
            <div className="skeleton h-44 rounded-[24px]" />
          </div>
        </div>
        <div className="hidden lg:block"><div className="skeleton h-[420px] rounded-[28px]" /></div>
      </div>
    </div>
  );
}
