import { ImageResponse } from "next/og";
import { MARK_C, MARK_J, MARK_STROKE, MARK_WINDOW } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Icono de inicio en iOS: mismo monograma JC, fondo a sangre (iOS recorta las esquinas). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A6B50",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 40 40">
          <path d={MARK_C} fill="none" stroke="#fff" strokeWidth={MARK_STROKE} strokeLinecap="round" strokeLinejoin="round" />
          <path d={MARK_J} fill="none" stroke="#fff" strokeWidth={MARK_STROKE} strokeLinecap="round" strokeLinejoin="round" />
          <rect x={MARK_WINDOW.x} y={MARK_WINDOW.y} width={MARK_WINDOW.size} height={MARK_WINDOW.size} rx={MARK_WINDOW.rx} fill="#D4A44A" />
        </svg>
      </div>
    ),
    size,
  );
}
