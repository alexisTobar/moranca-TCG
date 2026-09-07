import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { memoryRateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Tipos aceptados con su "número mágico" (los primeros bytes del archivo).
 * No basta con confiar en el mime que declara el navegador: cualquiera puede
 * renombrar un .exe a .png. Se valida el contenido real.
 */
const FIRMAS: Array<{ mime: string; ext: string; test: (b: Buffer) => boolean }> = [
  {
    mime: "image/jpeg",
    ext: "jpg",
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    ext: "png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
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

export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const limiter = memoryRateLimit(clientKey(req, `upload:${user.id}`), 30, 60);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Demasiadas subidas seguidas, espera un momento." },
        { status: 429 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No llegó ningún archivo" },
        { status: 400 }
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `La imagen pesa ${(file.size / 1048576).toFixed(1)} MB y el máximo son 4 MB.`,
        },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const firma = FIRMAS.find((f) => f.test(bytes));

    if (!firma) {
      return NextResponse.json(
        { error: "El archivo no es una imagen válida (usa JPG, PNG, WEBP o GIF)." },
        { status: 415 }
      );
    }

    const upload = await prisma.upload.create({
      data: {
        mimeType: firma.mime,
        size: bytes.length,
        data: bytes,
        filename: file.name.slice(0, 120) || null,
        uploadedBy: user.id,
      },
      select: { id: true },
    });

    return NextResponse.json(
      {
        ok: true,
        id: upload.id,
        url: `/api/uploads/${upload.id}.${firma.ext}`,
        size: bytes.length,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[uploads:POST]", error);
    return NextResponse.json({ error: "No se pudo subir la imagen" }, { status: 500 });
  }
}
