import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { listingSchema } from "@/lib/validators";
import { slugify } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "publicacion";
  let candidate = root;
  for (let i = 2; i < 200; i++) {
    const exists = await prisma.listing.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = listingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Solo el admin puede publicar en nombre de otro vendedor.
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

    const listing = await prisma.listing.create({
      data: {
        type: data.type,
        status: data.status,
        game: data.game,
        title: data.title,
        slug: await uniqueSlug(data.title),
        imageUrl: data.imageUrl ?? null,
        price: data.price,
        stock: data.stock,
        condition: data.condition ?? null,
        language: data.language ?? null,
        isFoil: data.isFoil,
        description: data.description ?? null,
        setName: data.setName ?? null,
        cardNumber: data.cardNumber ?? null,
        rarity: data.rarity ?? null,
        externalId: data.externalId ?? null,
        featured: user.role === "ADMIN" ? data.featured : false,
        sellerId,
        deckCards:
          data.type === "DECK"
            ? {
                create: data.deckCards.map((c, i) => ({
                  externalId: c.externalId ?? null,
                  name: c.name,
                  imageUrl: c.imageUrl ?? null,
                  quantity: c.quantity,
                  setName: c.setName ?? null,
                  cardNumber: c.cardNumber ?? null,
                  category: c.category ?? null,
                  position: i,
                })),
              }
            : undefined,
      },
      select: { id: true, slug: true },
    });

    return NextResponse.json({ ok: true, listing }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[listings:POST]", error);
    return NextResponse.json({ error: "Error al crear la publicación" }, { status: 500 });
  }
}
