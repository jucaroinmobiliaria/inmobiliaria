/** Normaliza a E.164 (`+573001234567`). Números locales de 10 dígitos se asumen Colombia (+57). */
export function toE164(raw: string | null | undefined, defaultCc = "57"): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits) return null;
  if (digits.length < 7 || digits.length > 15) return null;
  if (digits.length === 10 && (digits.startsWith("3") || digits.startsWith("6"))) {
    digits = `${defaultCc}${digits}`;
  } else if (digits.length <= 10 && !digits.startsWith(defaultCc)) {
    digits = `${defaultCc}${digits}`;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}
