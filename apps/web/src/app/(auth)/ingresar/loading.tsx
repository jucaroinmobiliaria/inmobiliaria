export default function Loading() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-5 pt-[68px]">
      <div className="w-full max-w-[440px] space-y-4">
        <div className="skeleton h-3 w-40" />
        <div className="skeleton h-12 w-72" />
        <div className="skeleton h-14 w-full rounded-full" />
        <div className="skeleton h-14 w-full rounded-full" />
        <div className="grid h-14 w-full place-items-center rounded-full bg-brand-600 text-base font-semibold text-white shadow-[0_6px_18px_-6px_rgb(10_107_80/0.65)]">Ingresar</div>
      </div>
    </div>
  );
}
