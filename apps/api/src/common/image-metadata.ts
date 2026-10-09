/**
 * Elimina metadatos privados (GPS, fecha, modelo de cámara, miniaturas, XMP…) de las fotos subidas.
 * Una foto tomada con el móvil lleva la ubicación EXACTA en EXIF: si el anunciante oculta la dirección,
 * esa foto la revelaría igualmente. No se recodifica la imagen (sin pérdida de calidad): se quitan segmentos/chunks.
 *
 * - JPEG: se descartan APP1 (EXIF/XMP), APP13 (Photoshop/IPTC) y comentarios; se conservan ICC y Adobe (color).
 *   Si el EXIF traía una orientación distinta de 1 se escribe un EXIF mínimo solo con ese dato (para que no se vea girada).
 * - PNG: se descartan eXIf, tEXt, zTXt, iTXt y tIME.
 * - WebP: se descartan los chunks EXIF y XMP y se limpian sus banderas en VP8X.
 * - AVIF y otros: se devuelven sin cambios.
 */

const SOI = 0xd8;

function readOrientation(exif: Buffer): number | null {
  // exif = contenido del segmento APP1 tras "Exif\0\0": cabecera TIFF
  if (exif.length < 12) return null;
  const little = exif[0] === 0x49 && exif[1] === 0x49;
  const big = exif[0] === 0x4d && exif[1] === 0x4d;
  if (!little && !big) return null;
  const u16 = (o: number) => (little ? exif.readUInt16LE(o) : exif.readUInt16BE(o));
  const u32 = (o: number) => (little ? exif.readUInt32LE(o) : exif.readUInt32BE(o));
  if (u16(2) !== 0x002a) return null;
  const ifd = u32(4);
  if (ifd < 8 || ifd + 2 > exif.length) return null;
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > exif.length) return null;
    if (u16(e) === 0x0112) {
      const v = u16(e + 8);
      return v >= 1 && v <= 8 ? v : null;
    }
  }
  return null;
}

function orientationSegment(orientation: number): Buffer {
  // APP1 "Exif\0\0" + TIFF big-endian con un único tag (Orientation, SHORT).
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // cabecera, IFD0 en 8
    0x00, 0x01, // 1 entrada
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, // Orientation
    0x00, 0x00, 0x00, 0x00, // sin IFD siguiente
  ]);
  const body = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const head = Buffer.from([0xff, 0xe1, 0, 0]);
  head.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([head, body]);
}

export function stripJpeg(buf: Buffer): Buffer {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== SOI) return buf;
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let orientation: number | null = null;
  let i = 2;
  let removed = false;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xff) {
      parts.push(buf.subarray(i)); // datos inesperados: se conserva el resto tal cual
      i = buf.length;
      break;
    }
    const marker = buf[i + 1]!;
    if (marker === 0xff) {
      i++; // relleno
      continue;
    }
    if (marker === 0xda) {
      parts.push(buf.subarray(i)); // inicio del escaneo: el resto es imagen
      i = buf.length;
      break;
    }
    if (marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > buf.length) {
      parts.push(buf.subarray(i));
      i = buf.length;
      break;
    }
    const len = buf.readUInt16BE(i + 2);
    const end = i + 2 + len;
    if (len < 2 || end > buf.length) {
      parts.push(buf.subarray(i));
      i = buf.length;
      break;
    }
    const seg = buf.subarray(i, end);
    const drop = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (drop) {
      removed = true;
      if (marker === 0xe1 && seg.length > 10 && seg.subarray(4, 10).equals(Buffer.from("Exif\0\0", "latin1"))) orientation = readOrientation(seg.subarray(10)) ?? orientation;
    } else {
      parts.push(seg);
    }
    i = end;
  }
  if (!removed) return buf;
  if (orientation && orientation !== 1) {
    // El EXIF mínimo va justo detrás de SOI/JFIF para respetar el orden habitual de segmentos.
    const jfif = parts[1] && parts[1][1] === 0xe0 ? 2 : 1;
    parts.splice(jfif, 0, orientationSegment(orientation));
  }
  return Buffer.concat(parts);
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_DROP = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

export function stripPng(buf: Buffer): Buffer {
  if (buf.length < 12 || !buf.subarray(0, 8).equals(PNG_SIG)) return buf;
  const parts: Buffer[] = [buf.subarray(0, 8)];
  let i = 8;
  let removed = false;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const end = i + 12 + len;
    if (end > buf.length) {
      parts.push(buf.subarray(i));
      i = buf.length;
      break;
    }
    const type = buf.subarray(i + 4, i + 8).toString("latin1");
    if (PNG_DROP.has(type)) removed = true;
    else parts.push(buf.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }
  return removed ? Buffer.concat(parts) : buf;
}

export function stripWebp(buf: Buffer): Buffer {
  if (buf.length < 20 || buf.subarray(0, 4).toString("latin1") !== "RIFF" || buf.subarray(8, 12).toString("latin1") !== "WEBP") return buf;
  const parts: Buffer[] = [];
  let i = 12;
  let removed = false;
  while (i + 8 <= buf.length) {
    const type = buf.subarray(i, i + 4).toString("latin1");
    const len = buf.readUInt32LE(i + 4);
    const end = i + 8 + len + (len % 2);
    if (i + 8 + len > buf.length) return buf; // truncado: no se toca
    let chunk = buf.subarray(i, Math.min(end, buf.length));
    if (type === "EXIF" || type === "XMP ") {
      removed = true;
    } else {
      if (type === "VP8X" && chunk.length >= 9) {
        chunk = Buffer.from(chunk);
        chunk[8] = chunk[8]! & ~(0x08 | 0x04); // bandera EXIF y XMP
      }
      parts.push(chunk);
    }
    i = end;
  }
  if (!removed) return buf;
  const body = Buffer.concat(parts);
  const head = Buffer.from("RIFF\0\0\0\0WEBP", "latin1");
  head.writeUInt32LE(body.length + 4, 4);
  return Buffer.concat([head, body]);
}

export function stripImageMetadata(buf: Buffer, mime: string): Buffer {
  try {
    if (mime === "image/jpeg") return stripJpeg(buf);
    if (mime === "image/png") return stripPng(buf);
    if (mime === "image/webp") return stripWebp(buf);
  } catch {
    /* ante cualquier rareza se conserva el archivo original */
  }
  return buf;
}
