/** Convierte enlaces de video/tour en URLs seguras de incrustación (lista blanca). Cualquier otro sitio se abre en una pestaña nueva. */
export type MediaTarget = { kind: "embed"; src: string; provider: "YouTube" | "Vimeo" | "Matterport" } | { kind: "link"; href: string } | { kind: "none" };

export function parseMedia(raw: string | null | undefined): MediaTarget {
  if (!raw) return { kind: "none" };
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return { kind: "none" }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { kind: "none" };
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/)?.[1];
    if (id && /^[\w-]{6,}$/.test(id)) return { kind: "embed", provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` };
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (id && /^[\w-]{6,}$/.test(id)) return { kind: "embed", provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.match(/(\d{6,})/)?.[1];
    if (id) return { kind: "embed", provider: "Vimeo", src: `https://player.vimeo.com/video/${id}` };
  }
  if (host === "my.matterport.com") {
    const id = u.searchParams.get("m") ?? u.pathname.match(/\/show\/([\w]+)/)?.[1];
    if (id && /^\w{6,}$/.test(id)) return { kind: "embed", provider: "Matterport", src: `https://my.matterport.com/show/?m=${id}` };
  }
  return { kind: "link", href: u.toString() };
}
