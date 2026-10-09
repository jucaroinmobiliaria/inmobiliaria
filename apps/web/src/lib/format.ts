const cop = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

export function formatPrice(value: number | null | undefined, currency: "COP" | "USD" = "COP") {
  if (value == null) return "—";
  return `${currency === "USD" ? "US$" : "$"} ${cop.format(value)}`;
}

/** 1.250.000.000 -> "$ 1.250 M" · 3.800.000 -> "$ 3,8 M" · 850.000 -> "$ 850 mil" */
export function formatPriceShort(value: number | null | undefined, currency: "COP" | "USD" = "COP") {
  if (value == null) return "—";
  const sym = currency === "USD" ? "US$" : "$";
  if (value >= 1_000_000_000) return `${sym} ${cop.format(Math.round(value / 1_000_000))} M`;
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${sym} ${m >= 100 ? cop.format(Math.round(m)) : (Math.round(m * 10) / 10).toLocaleString("es-CO")} M`;
  }
  if (value >= 1_000) return `${sym} ${cop.format(Math.round(value / 1_000))} mil`;
  return `${sym} ${cop.format(value)}`;
}

export const formatCompact = (n: number) => compact.format(n);
export const formatNumber = (n: number | null | undefined) => (n == null ? "—" : cop.format(n));
export const formatArea = (n: number | null | undefined) => (n == null ? "—" : `${cop.format(Math.round(n))} m²`);

export function plural(n: number, one: string, many: string) {
  return `${cop.format(n)} ${n === 1 ? one : many}`;
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", opts).format(new Date(iso));
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} d`;
  return formatDate(iso, { day: "numeric", month: "short" });
}

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export const whatsappLink = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
