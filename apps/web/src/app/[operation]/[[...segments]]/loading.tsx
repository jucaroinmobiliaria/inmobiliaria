export default function Loading() {
  return (
    <div className="pt-[68px]" aria-busy="true" aria-label="Cargando resultados">
      <div className="border-b border-line"><div className="container-x flex h-[72px] items-center gap-3"><div className="skeleton h-11 w-48 rounded-full" /><div className="skeleton h-11 w-72 rounded-full" /><div className="skeleton hidden h-11 w-24 rounded-full md:block" /><div className="skeleton hidden h-11 w-24 rounded-full md:block" /></div></div>
      <div className="container-x pt-12">
        <div className="skeleton h-4 w-64" /><div className="skeleton mt-5 h-12 w-2/3 max-w-xl" /><div className="skeleton mt-4 h-5 w-full max-w-2xl" />
        <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.9fr]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid gap-3"><div className="skeleton aspect-[4/3] w-full rounded-[20px]" /><div className="skeleton h-8 w-2/3" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-1/2" /></div>
          ))}
        </div>
      </div>
    </div>
  );
}
