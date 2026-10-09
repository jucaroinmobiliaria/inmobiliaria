import { ImageResponse } from "next/og";
import { MARK_C, MARK_J } from "@/lib/brand-mark";

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
          <path d={MARK_C} fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d={MARK_J} fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="23.6" cy="19.4" r="2.15" fill="#D4A44A" />
        </svg>
      </div>
    ),
    size,
  );
}
