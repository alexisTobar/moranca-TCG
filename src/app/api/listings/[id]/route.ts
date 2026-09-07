import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { listingBaseSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadOwned(id: string, userId: string, isAdmin: boolean) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, sellerId: true },
  });
  if (!listing) return { error: "Publicación no encontrada", status: 404 as const };
  if (!isAdmin && listing.sellerId !== userId) {
    return { error: "No puedes modificar esta publicación", status: 403 as const };
  }
  return { listing };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const owned = await loadOwned(id, user.id, user.role === "ADMIN");
    if ("error" in owned) {
      return NextResponse.json({ error: owned.error }, { status: owned.status });
    }

    const parsed = listingBaseSchema.partial().safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      if (data.deckCards) {
        await tx.deckCard.deleteMany({ where: { listingId: id } });
        if (data.deckCards.length) {
          await tx.deckCard.createMany({
            data: data.deckCards.map((c, i) => ({
              listingId: id,
              externalId: c.externalId ?? null,
              name: c.name,
              imageUrl: c.imageUrl ?? null,
              quantity: c.quantity,
              setName: c.setName ?? null,
              cardNumber: c.cardNumber ?? null,
              category: c.category ?? null,
              position: i,
            })),
          });
        }
      }

      return tx.listing.update({
        where: { id },
        data: {
          type: data.type,
          status: data.status,
          game: data.game,
          title: data.title,
          imageUrl: data.imageUrl,
          price: data.price,
          stock: data.stock,
          condition: data.condition,
          language: data.language,
          isFoil: data.isFoil,
          description: data.description,
          setName: data.setName,
          cardNumber: data.cardNumber,
          rarity: data.rarity,
          externalId: data.externalId,
          ...(user.role === "ADMIN" && data.featured !== undefined
            ? { featured: data.featured }
            : {}),
          ...(user.role === "ADMIN" && data.sellerId
            ? { sellerId: data.sellerId }
            : {}),
        },
        select: { id: true, slug: true },
      });
    });

    return NextResponse.json({ ok: true, listing: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[listings:PATCH]", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const owned = await loadOwned(id, user.id, user.role === "ADMIN");
    if ("error" in owned) {
      return NextResponse.json({ error: owned.error }, { status: owned.status });
    }

    await prisma.listing.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[listings:DELETE]", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
