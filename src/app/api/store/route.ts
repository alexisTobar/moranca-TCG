import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { storeUpdateSchema } from "@/lib/validators";
import { ensureStore, isStoreActive } from "@/lib/store";
import {
  normalizeFacebook,
  normalizeInstagram,
  normalizeWebsite,
  normalizeWhatsapp,
} from "@/lib/store-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** El vendedor personaliza su propia tienda. Cada uno solo puede tocar la suya. */
export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "SELLER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo los vendedores tienen tienda" }, { status: 403 });
    }

    const parsed = storeUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const store = await ensureStore(user.id);

    // Los enlaces se normalizan: si algo no es un usuario/número/URL válido, se rechaza.
    const social: Record<string, string | null> = {};
    const checks: Array<[keyof typeof data, string, (v: string | null) => string | null]> = [
      ["instagram", "Instagram", normalizeInstagram],
      ["facebook", "Facebook", normalizeFacebook],
      ["whatsapp", "WhatsApp", normalizeWhatsapp],
      ["website", "sitio web", normalizeWebsite],
    ];
    for (const [key, label, fn] of checks) {
      const raw = data[key] as string | null | undefined;
      if (raw === undefined) continue;
      if (raw === null || raw.trim() === "") {
        social[key] = null;
        continue;
      }
      const clean = fn(raw);
      if (!clean) {
        return NextResponse.json({ error: `El dato de ${label} no es válido.` }, { status: 400 });
      }
      social[key] = clean;
    }

    // Los destacados deben ser productos activos del propio vendedor y respetar el tope del plan.
    let featuredListingIds: string[] | undefined;
    if (data.featuredListingIds) {
      const unique = [...new Set(data.featuredListingIds)];
      const max = store.plan?.maxFeatured ?? 6;
      if (unique.length > max) {
        return NextResponse.json(
          { error: `Tu plan permite destacar hasta ${max} productos.` },
          { status: 400 }
        );
      }
      const own = await prisma.listing.findMany({
        where: { id: { in: unique }, sellerId: user.id, status: "ACTIVE" },
        select: { id: true },
      });
      const ownIds = new Set(own.map((l) => l.id));
      featuredListingIds = unique.filter((id) => ownIds.has(id));
    }

    const blank = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() ? v.trim() : null);

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: {
        ...(data.displayName !== undefined ? { displayName: blank(data.displayName) } : {}),
        ...(data.tagline !== undefined ? { tagline: blank(data.tagline) } : {}),
        ...(data.about !== undefined ? { about: blank(data.about) } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.bannerUrl !== undefined ? { bannerUrl: data.bannerUrl } : {}),
        ...(data.accentColor !== undefined ? { accentColor: data.accentColor } : {}),
        ...(data.announcement !== undefined ? { announcement: blank(data.announcement) } : {}),
        ...social,
        ...(featuredListingIds ? { featuredListingIds } : {}),
      },
      include: { plan: true },
    });

    return NextResponse.json({ ok: true, active: isStoreActive(updated), store: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[store:PUT]", error);
    return NextResponse.json({ error: "No se pudo guardar tu tienda" }, { status: 500 });
  }
}
