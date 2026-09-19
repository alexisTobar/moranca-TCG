/**
 * Tipos aceptados con su "número mágico" (los primeros bytes del archivo).
 * No basta con confiar en el mime que declara el navegador: cualquiera puede
 * renombrar un .exe a .png. Se valida el contenido real.
 */
export interface FileSignature {
  mime: string;
  ext: string;
  test: (b: Buffer) => boolean;
}

export const IMAGE_SIGNATURES: FileSignature[] = [
  {
    mime: "image/jpeg",
    ext: "jpg",
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    ext: "png",
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    mime: "image/gif",
    ext: "gif",
    test: (b) => b.subarray(0, 3).toString("ascii") === "GIF",
  },
];

export const PDF_SIGNATURE: FileSignature = {
  mime: "application/pdf",
  ext: "pdf",
  test: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-",
};

export function detectSignature(bytes: Buffer, allowed: FileSignature[]): FileSignature | null {
  return allowed.find((f) => f.test(bytes)) ?? null;
}
