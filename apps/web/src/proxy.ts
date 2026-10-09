import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy de Next 16 (antes "middleware"):
 *  - Rutas privadas sin sesión -> /ingresar?next=…
 *  - Si caducó el access_token pero existe refresh_token, lo renueva aquí (los Server Components no pueden fijar cookies).
 */
const API = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

function toLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  const next = req.nextUrl.pathname + req.nextUrl.search;
  url.pathname = "/ingresar";
  url.search = `?next=${encodeURIComponent(next)}`;
  const res = NextResponse.redirect(url);
  return res;
}

export async function proxy(req: NextRequest) {
  const access = req.cookies.get("access_token")?.value;
  const refresh = req.cookies.get("refresh_token")?.value;
  const isFavorites = req.nextUrl.pathname === "/favoritos";

  if (access) return NextResponse.next();
  if (!refresh) return isFavorites ? NextResponse.next() : toLogin(req);

  try {
    const r = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { cookie: `refresh_token=${refresh}` }, cache: "no-store" });
    if (!r.ok) return isFavorites ? NextResponse.next() : toLogin(req);
    const setCookies = r.headers.getSetCookie();
    const jar = new Map(req.cookies.getAll().map((c) => [c.name, c.value] as const));
    for (const sc of setCookies) {
      const [pair] = sc.split(";");
      const i = pair!.indexOf("=");
      jar.set(pair!.slice(0, i).trim(), pair!.slice(i + 1));
    }
    const headers = new Headers(req.headers);
    headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const res = NextResponse.next({ request: { headers } });
    for (const sc of setCookies) res.headers.append("set-cookie", sc);
    return res;
  } catch {
    return isFavorites ? NextResponse.next() : toLogin(req);
  }
}

export const config = { matcher: ["/panel/:path*", "/publicar/:path*", "/admin/:path*", "/favoritos"] };
