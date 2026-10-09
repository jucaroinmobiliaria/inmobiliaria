export function slugify(input: string, max = 60): string {
  const s = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const i = cut.lastIndexOf("-");
  return (i > 20 ? cut.slice(0, i) : cut).replace(/-+$/, "");
}

/** Normaliza para comparaciones sin tildes ni mayúsculas. */
export function fold(input: string): string {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
