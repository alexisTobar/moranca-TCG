import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { MANUAL_NEWS_SOURCE as MANUAL_SOURCE } from "@/lib/news/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const optionalUrl = z.string().trim().max(500).refine((v) => !v || /^https:\/\//i.test(v), "El enlace debe empezar con https://").optional();
const schema = z.object({
  title: z.string().trim().min(4, "Escribe el nombre del evento").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha del evento"),
  city: z.string().trim().min(2, "Escribe la ciudad").max(60),
  place: z.string().trim().max(100).optional(),
  description: z.string().trim().max(400).optional(),
  category: z.enum(["GENERAL", "POKEMON", "ONEPIECE", "MAGIC", "MYL"]),
  link: optionalUrl,
  // Solo imágenes subidas al sitio: un enlace externo lo bloquearía la política de seguridad.
  imageUrl: z.string().trim().max(200).refine((v) => !v || /^\/api\/uploads\/[\w-]+\.(png|jpe?g|webp|gif|avif)$/i.test(v), "Sube la imagen desde el formulario").optional(),
});

/** El administrador agrega un evento de Chile a la agenda de noticias (por ejemplo, un evento de tienda que no sale en ningún feed). */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    const { title, date, city, place, description, category, link, imageUrl } = parsed.data;
    // Igual que los torneos de PlayLatam: el evento sigue visible hasta el final de su día en Chile.
    const eventAt = new Date(`${date}T23:59:59-03:00`);
    if (!Number.isFinite(eventAt.getTime()) || eventAt < new Date()) return NextResponse.json({ error: "La fecha ya pasó" }, { status: 400 });
    const where = [place, city].filter(Boolean).join(", ");
    const item = await prisma.newsItem.create({
      data: {
        title, originalTitle: title, category, kind: "TOURNAMENT", country: "CL", eventAt,
        excerpt: description ? `${where}. ${description}` : where,
        imageUrl: imageUrl || null,
        // sourceUrl es único: sin enlace del organizador se usa un ancla propia.
        sourceUrl: link || `https://tcgcardeck.cl/noticias#evento-${randomUUID()}`,
        sourceName: MANUAL_SOURCE,
        publishedAt: new Date(),
      },
    });
    await audit(admin, "news.event_create", { type: "NewsItem", id: item.id, detail: `${title} (${date})` });
    revalidatePath("/noticias");
    return NextResponse.json({ ok: true, id: item.id });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: "Ya hay un evento con ese enlace" }, { status: 409 });
    console.error("[admin:news]", error);
    return NextResponse.json({ error: "No se pudo guardar el evento" }, { status: 500 });
  }
}

/** Quita un evento cargado a mano. Los de las fuentes automáticas no se borran aquí: volverían en la siguiente actualización. */
export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta el evento" }, { status: 400 });
    const removed = await prisma.newsItem.deleteMany({ where: { id, sourceName: MANUAL_SOURCE } });
    if (!removed.count) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    await audit(admin, "news.event_delete", { type: "NewsItem", id });
    revalidatePath("/noticias");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "No se pudo quitar el evento" }, { status: 500 });
  }
}
