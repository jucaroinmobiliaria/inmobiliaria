// Comprueba que las fotos de ejemplo (Unsplash) sigan existiendo.  node scripts/check-images.mjs
import { readFileSync } from "node:fs";
const files = ["apps/api/prisma/seed-images.ts", "apps/web/src/lib/images.ts"];
const ids = new Set();
for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/"?(\d{10,}-[0-9a-f]{12})"?|u\("(\d{10,}-[0-9a-f]{12})"/g)) ids.add(m[1] ?? m[2]);
let bad = 0;
for (const id of ids) {
  const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=200&q=40`;
  const r = await fetch(url, { method: "HEAD" }).catch(() => null);
  if (!r?.ok) { bad++; console.log("✗", id, r?.status ?? "sin respuesta"); }
}
console.log(bad ? `${bad} de ${ids.size} fotos no responden: reemplázalas en seed-images.ts / images.ts` : `Las ${ids.size} fotos responden bien.`);
