import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Jucaro — Inmuebles con raíz en Colombia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_DIR = join(process.cwd(), "node_modules/@fontsource/instrument-serif/files");

/** Tarjeta del enlace: el logo completo sobre papel, con la frase de la marca. */
export default async function OpenGraphImage() {
  const [logo, italic, italicExt] = await Promise.all([
    readFile(join(process.cwd(), "public/brand/logo.png")),
    readFile(join(FONT_DIR, "instrument-serif-latin-400-italic.woff")),
    readFile(join(FONT_DIR, "instrument-serif-latin-ext-400-italic.woff")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7F3EC",
        }}
      >
        <img src={`data:image/png;base64,${logo.toString("base64")}`} width={820} height={277} alt="" />
        <div
          style={{
            marginTop: 36,
            fontSize: 36,
            lineHeight: 1,
            color: "#0A6B50",
            fontFamily: "Instrument Serif",
            fontStyle: "italic",
          }}
        >
          Inmuebles con raíz en Colombia
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: italic, weight: 400, style: "italic" },
        { name: "Instrument Serif", data: italicExt, weight: 400, style: "italic" },
      ],
    },
  );
}
