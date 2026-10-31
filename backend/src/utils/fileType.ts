// Detects the real file type from magic bytes — never trust the extension or Content-Type (backend.md §5.6).
// SVG is deliberately not supported: it can carry <script> and would be served from our CDN.
export interface DetectedType {
  mimeType: string;
  ext: string;
}

function startsWith(buf: Uint8Array, bytes: number[], offset = 0): boolean {
  return bytes.every((b, i) => buf[offset + i] === b);
}

export function detectFileType(buf: Uint8Array): DetectedType | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { mimeType: "image/jpeg", ext: "jpg" };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mimeType: "image/png", ext: "png" };
  // "RIFF" .... "WEBP"
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mimeType: "image/webp", ext: "webp" };
  }
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mimeType: "application/pdf", ext: "pdf" };
  // ISO base media: "ftyp" at offset 4. "qt  " brand = QuickTime (.mov), anything else is treated as MP4.
  if (startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) {
    return startsWith(buf, [0x71, 0x74, 0x20, 0x20], 8)
      ? { mimeType: "video/quicktime", ext: "mov" }
      : { mimeType: "video/mp4", ext: "mp4" };
  }
  // EBML header (Matroska / WebM)
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return { mimeType: "video/webm", ext: "webm" };
  return null;
}
