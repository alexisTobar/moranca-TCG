import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Sirve una imagen subida a mano.
 * El id nunca se reutiliza, así que la respuesta puede cachearse para siempre.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // La URL lleva extensión solo para que se vea bien: /api/uploads/abc123.png
  const uploadId = id.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");

  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    select: { data: true, mimeType: true },
  });

  if (!upload) {
    return new Response("Imagen no encontrada", { status: 404 });
  }

  return new Response(new Uint8Array(upload.data), {
    headers: {
      "Content-Type": upload.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(upload.data.length),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
