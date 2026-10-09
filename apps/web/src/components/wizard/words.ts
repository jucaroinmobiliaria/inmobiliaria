/** Número -> palabras en español (escala larga: 10^9 = "mil millones", 10^12 = "un billón"). */

const UNITS = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce",
  "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro",
  "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function below100(n: number): string {
  if (n < 30) return UNITS[n]!;
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? TENS[t]! : `${TENS[t]} y ${UNITS[u]}`;
}

function below1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts = [HUNDREDS[h]!, r ? below100(r) : ""].filter(Boolean);
  return parts.join(" ");
}

/** "uno" -> "un" cuando precede a mil/millón/billón ("veintiuno" -> "veintiún"). */
const apocope = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");

function words(n: number): string {
  if (n < 1000) return n === 0 ? "cero" : below1000(n);
  if (n < 1_000_000) {
    const th = Math.floor(n / 1000);
    const rest = n % 1000;
    const head = th === 1 ? "mil" : `${apocope(words(th))} mil`;
    return rest ? `${head} ${below1000(rest)}` : head;
  }
  if (n < 1_000_000_000_000) {
    const m = Math.floor(n / 1_000_000);
    const rest = n % 1_000_000;
    const head = m === 1 ? "un millón" : `${apocope(words(m))} millones`;
    return rest ? `${head} ${words(rest)}` : head;
  }
  const b = Math.floor(n / 1_000_000_000_000);
  const rest = n % 1_000_000_000_000;
  const head = b === 1 ? "un billón" : `${apocope(words(b))} billones`;
  return rest ? `${head} ${words(rest)}` : head;
}

export function numberToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  return words(Math.floor(n));
}

/** "Mil doscientos cincuenta millones de pesos". */
export function priceInWords(n: number, currency: "COP" | "USD" = "COP"): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  const w = numberToWords(n);
  const unit = currency === "USD" ? (n === 1 ? "dólar" : "dólares") : (n === 1 ? "peso" : "pesos");
  const de = n >= 1_000_000 && n % 1_000_000 === 0 ? " de" : "";
  const out = `${w}${de} ${unit}`;
  return out.charAt(0).toUpperCase() + out.slice(1);
}
