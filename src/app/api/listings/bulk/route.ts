import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { bulkCreateSchema } from "@/lib/validators";
import { uniqueSlug } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = bulkCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const sellerId =
      user.role === "ADMIN" && data.sellerId ? data.sellerId : user.id;

    if (sellerId !== user.id) {
      const seller = await prisma.user.findUnique({
        where: { id: sellerId },
        select: { id: true },
      });
      if (!seller) {
        return NextResponse.json({ error: "Vendedor no existe" }, { status: 400 });
      }
    }

    // Se crea una por una (no createMany) porque cada publicación necesita su
    // propio slug único, calculado contra las que ya existen.
    const created: string[] = [];
    for (const item of data.items) {
      const listing = await prisma.listing.create({
        data: {
          type: "SINGLE",
          status: data.status,
          game: data.game,
          title: item.title,
          slug: await uniqueSlug(item.title),
          imageUrl: item.imageUrl ?? null,
          price: item.price,
          stock: item.stock,
          condition: data.condition ?? null,
          language: data.language ?? null,
          isFoil: item.isFoil,
          setName: item.setName ?? null,
          cardNumber: item.cardNumber ?? null,
          rarity: item.rarity ?? null,
          externalId: item.externalId ?? null,
          sellerId,
        },
        select: { id: true },
      });
      created.push(listing.id);
    }

    return NextResponse.json({ ok: true, created: created.length }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[listings/bulk:POST]", error);
    return NextResponse.json(
      { error: "Error al crear las publicaciones" },
      { status: 500 }
    );
  }
}
