import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { clientKey, memoryRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

/** Suma una vista a la publicación. Contador agregado: no guarda quién la vio ni usa cookies propias. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id) || BOT.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  // Una vista por persona y publicación cada 30 minutos, para que recargar no infle el número.
  if (!memoryRateLimit(clientKey(req, `view:${id}`), 1, 1800).allowed) return new NextResponse(null, { status: 204 });
  try {
    const session = await getSession();
    // El vendedor mirando su propia publicación no cuenta.
    await prisma.listing.updateMany({ where: { id, status: "ACTIVE", ...(session ? { sellerId: { not: session.sub } } : {}) }, data: { views: { increment: 1 } } });
  } catch {
    // Contar una vista nunca debe romper la ficha.
  }
  return new NextResponse(null, { status: 204 });
}
