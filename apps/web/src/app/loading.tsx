export default function Loading() {
  return (
    <div className="container-x pb-24 pt-[110px]" role="status" aria-label="Cargando">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton mt-4 h-12 w-full max-w-xl" />
      <div className="skeleton mt-3 h-5 w-full max-w-md" />
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="grid gap-3">
            <div className="skeleton aspect-[4/3] w-full rounded-[20px]" />
            <div className="skeleton h-7 w-2/3" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-1/2" />
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
