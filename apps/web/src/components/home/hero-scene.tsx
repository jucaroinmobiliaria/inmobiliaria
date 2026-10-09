/** Escena ilustrada de respaldo para el héroe (se ve mientras carga la foto o si no se puede cargar). Determinista por `seed`. */
const PALETTES = [
  { sky: ["#0b241e", "#2c5a4b", "#7fa793"], far: "#1c4a3d", near: "#0f3329", tower: "#0a261f", win: "#ffe3a3", glow: "#ffd98a" },
  { sky: ["#2b1e1c", "#8a5a45", "#f0b672"], far: "#6a4637", near: "#3f2a24", tower: "#2a1b17", win: "#ffe6b3", glow: "#ffcf86" },
  { sky: ["#0f2237", "#35688f", "#9cc3dc"], far: "#27506f", near: "#163650", tower: "#0d2438", win: "#fff0c2", glow: "#cfe6f5" },
  { sky: ["#1b2c27", "#587a68", "#cfe0cf"], far: "#41624f", near: "#2a4639", tower: "#18302a", win: "#fff3cf", glow: "#f6f0d0" },
] as const;

function rng(seed: number) {
  let a = (seed + 1) * 2654435761;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function HeroScene({ seed = 0 }: { seed?: number }) {
  const p = PALETTES[Math.abs(seed) % PALETTES.length]!;
  const r = rng(seed * 7 + 3);
  const id = `hs${seed}`;
  // Torres en el 55% derecho; la izquierda queda despejada para el titular
  const towers = Array.from({ length: 9 }, (_, i) => {
    const w = 110 + r() * 120;
    const x = 720 + i * 100 + r() * 40;
    const h = 240 + r() * 300;
    return { x, w, h, i };
  });
  const far = `M0 640 C140 560 260 600 380 560 S 620 520 760 590 S 1040 520 1200 580 S 1480 540 1600 590 V900 H0Z`;
  const near = `M0 740 C160 690 300 720 460 690 S 760 700 900 740 S 1200 690 1380 730 S 1540 720 1600 740 V900 H0Z`;
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky[0]} /><stop offset=".55" stopColor={p.sky[1]} /><stop offset="1" stopColor={p.sky[2]} /></linearGradient>
        <radialGradient id={`${id}-glow`} cx=".78" cy=".42" r=".55"><stop offset="0" stopColor={p.glow} stopOpacity=".55" /><stop offset="1" stopColor={p.glow} stopOpacity="0" /></radialGradient>
        <pattern id={`${id}-win`} width="30" height="34" patternUnits="userSpaceOnUse"><rect x="8" y="8" width="13" height="17" rx="1.5" fill={p.win} opacity=".85" /></pattern>
        <filter id={`${id}-noise`} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.028 0.05" numOctaves="2" seed={seed + 4} /><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 11 -4.7" /></filter>
        <mask id={`${id}-lit`} maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900"><rect width="1600" height="900" fill="#fff" filter={`url(#${id}-noise)`} /></mask>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".35" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      <rect width="1600" height="900" fill={`url(#${id}-glow)`} />
      <circle cx="1240" cy="330" r="86" fill={p.glow} opacity=".35" />
      <path d={far} fill={p.far} opacity=".9" />
      {towers.map((t) => (
        <g key={t.i} opacity={0.55 + (t.i % 3) * 0.12}>
          <rect x={t.x} y={900 - t.h} width={t.w} height={t.h} fill={p.tower} />
          <rect x={t.x} y={900 - t.h} width={t.w} height={t.h} fill={`url(#${id}-win)`} mask={`url(#${id}-lit)`} />
          <rect x={t.x} y={900 - t.h} width={t.w} height="6" fill="#fff" opacity=".08" />
        </g>
      ))}
      <path d={near} fill={p.near} />
      {[90, 230, 420].map((x, i) => <g key={x} opacity=".9"><circle cx={x} cy={760 - i * 6} r={44 - i * 6} fill={p.near} /><rect x={x - 5} y={780 - i * 6} width="10" height="50" fill={p.tower} /></g>)}
      <rect width="1600" height="900" fill={`url(#${id}-fade)`} />
    </svg>
  );
}
