export type PhoneCountry = { iso: string; name: string; dial: string; flag: string };

/** Colombia primero; el resto en español, LatAm y destinos frecuentes. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "CO", name: "Colombia", dial: "57", flag: "🇨🇴" },
  { iso: "VE", name: "Venezuela", dial: "58", flag: "🇻🇪" },
  { iso: "EC", name: "Ecuador", dial: "593", flag: "🇪🇨" },
  { iso: "PE", name: "Perú", dial: "51", flag: "🇵🇪" },
  { iso: "PA", name: "Panamá", dial: "507", flag: "🇵🇦" },
  { iso: "MX", name: "México", dial: "52", flag: "🇲🇽" },
  { iso: "AR", name: "Argentina", dial: "54", flag: "🇦🇷" },
  { iso: "CL", name: "Chile", dial: "56", flag: "🇨🇱" },
  { iso: "BR", name: "Brasil", dial: "55", flag: "🇧🇷" },
  { iso: "US", name: "Estados Unidos", dial: "1", flag: "🇺🇸" },
  { iso: "ES", name: "España", dial: "34", flag: "🇪🇸" },
  { iso: "CR", name: "Costa Rica", dial: "506", flag: "🇨🇷" },
  { iso: "DO", name: "República Dominicana", dial: "1", flag: "🇩🇴" },
  { iso: "UY", name: "Uruguay", dial: "598", flag: "🇺🇾" },
  { iso: "PY", name: "Paraguay", dial: "595", flag: "🇵🇾" },
  { iso: "BO", name: "Bolivia", dial: "591", flag: "🇧🇴" },
  { iso: "GT", name: "Guatemala", dial: "502", flag: "🇬🇹" },
  { iso: "HN", name: "Honduras", dial: "504", flag: "🇭🇳" },
  { iso: "SV", name: "El Salvador", dial: "503", flag: "🇸🇻" },
  { iso: "NI", name: "Nicaragua", dial: "505", flag: "🇳🇮" },
  { iso: "CU", name: "Cuba", dial: "53", flag: "🇨🇺" },
  { iso: "PR", name: "Puerto Rico", dial: "1", flag: "🇵🇷" },
  { iso: "CA", name: "Canadá", dial: "1", flag: "🇨🇦" },
  { iso: "GB", name: "Reino Unido", dial: "44", flag: "🇬🇧" },
  { iso: "DE", name: "Alemania", dial: "49", flag: "🇩🇪" },
  { iso: "FR", name: "Francia", dial: "33", flag: "🇫🇷" },
  { iso: "IT", name: "Italia", dial: "39", flag: "🇮🇹" },
  { iso: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { iso: "AU", name: "Australia", dial: "61", flag: "🇦🇺" },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]!;

const BY_DIAL = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

export function countryByIso(iso: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.iso === iso) ?? DEFAULT_PHONE_COUNTRY;
}

export function parsePhone(raw: string | null | undefined): { country: PhoneCountry; national: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { country: DEFAULT_PHONE_COUNTRY, national: "" };
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && (digits.startsWith("3") || digits.startsWith("6"))) {
    return { country: DEFAULT_PHONE_COUNTRY, national: digits };
  }
  for (const c of BY_DIAL) {
    if (digits.startsWith(c.dial) && digits.length > c.dial.length) {
      return { country: c, national: digits.slice(c.dial.length) };
    }
  }
  return { country: DEFAULT_PHONE_COUNTRY, national: digits };
}

/** E.164 (`+573001234567`) o cadena vacía. */
export function toE164(national: string, country: PhoneCountry = DEFAULT_PHONE_COUNTRY): string {
  let digits = national.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits) return "";
  if (digits.startsWith(country.dial) && digits.length > country.dial.length + 5) {
    return `+${digits}`;
  }
  return `+${country.dial}${digits}`;
}

export function isValidPhone(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  const parsed = parsePhone(raw);
  const e164 = toE164(parsed.national, parsed.country);
  const digits = e164.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function formatPhoneDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const { country, national } = parsePhone(raw);
  if (!national) return `+${country.dial}`;
  if (country.iso === "CO" && national.length === 10) {
    return `+${country.dial} ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }
  return `+${country.dial} ${national}`;
}

export function formatNational(national: string, _iso?: string): string {
  return national.replace(/\D/g, "");
}
