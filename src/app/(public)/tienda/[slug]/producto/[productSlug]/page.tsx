import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { GAME_LIST } from "@/lib/games";
import { clp } from "@/lib/format";
import { ensureAdminPro, isStoreActive } from "@/lib/store";
import { storeThemeVars } from "@/lib/store-theme";
import { ProductDetail, getProductListing } from "@/components/product/ProductDetail";
import { StoreHeader } from "@/components/store/StoreHeader";

export const dynamic = "force-dynamic";

const TYPES = ["SINGLE", "SEALED", "DECK"];

async function loadStore(slug: string) {
  return safeQuery(
    () =>
      prisma.user.findFirst({
        where: { slug, active: true, role: { in: ["SELLER", "ADMIN"] } },
        select: {
          id: true,
          role: true,
          name: true,
          slug: true,
          bio: true,
          avatarUrl: true,
          store: true,
        },
      }),
    null
  );
}

type Params = Promise<{ slug: string; productSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { productSlug } = await params;
  const listing = await getProductListing(productSlug);
  if (!listing) return { title: "Producto no encontrado" };
  return {
    title: listing.title,
    description: listing.description ?? `${listing.title} por ${clp(listing.price)}.`,
    alternates: { canonical: `/producto/${productSlug}` },
    openGraph: { images: listing.imageUrl ? [listing.imageUrl] : undefined, title: listing.title },
  };
}

/** Ficha de producto dentro de una tienda premium: mismo encabezado de la tienda, sin el menú de Win Condition. */
export default async function StoreProductPage({ params }: { params: Params }) {
  const { slug, productSlug } = await params;
  let seller = await loadStore(slug);
  if (seller?.role === "ADMIN" && !isStoreActive(seller.store)) {
    await ensureAdminPro(seller.id);
    seller = await loadStore(slug);
  }
  if (!seller) notFound();
  const store = seller.store;
  // Sin membresía vigente no hay tienda: el producto se ve en la ficha normal.
  if (!store || !isStoreActive(store)) redirect(`/producto/${productSlug}`);

  const listing = await getProductListing(productSlug);
  // Solo se muestran productos de esta tienda; cualquier otro se abre en la ficha general.
  if (!listing || listing.status === "DRAFT") notFound();
  if (listing.sellerId !== seller.id) redirect(`/producto/${productSlug}`);

  const [viewer, byGame, byType] = await Promise.all([
    getCurrentUser(),
    safeQuery(
      () => prisma.listing.groupBy({ by: ["game"], where: { sellerId: seller.id, status: "ACTIVE" }, _count: { _all: true } }),
      [] as Array<{ game: string; _count: { _all: number } }>
    ),
    safeQuery(
      () => prisma.listing.groupBy({ by: ["type"], where: { sellerId: seller.id, status: "ACTIVE" }, _count: { _all: true } }),
      [] as Array<{ type: string; _count: { _all: number } }>
    ),
  ]);

  const name = store.displayName || seller.name;
  const logoUrl = store.logoUrl ?? seller.avatarUrl;

  return (
    <div style={storeThemeVars(store.accentColor) as React.CSSProperties} >
      <StoreHeader
        slug={seller.slug}
        name={name}
        logoUrl={logoUrl}
        announcement={store.announcement}
        q=""
        game=""
        type=""
        games={GAME_LIST.filter((g) => byGame.some((b) => b.game === g.id)).map((g) => g.id)}
        types={TYPES.filter((t) => byType.some((b) => b.type === t))}
        hasAbout={Boolean(store.about || seller.bio)}
      />
      <ProductDetail listing={listing} store={{ slug: seller.slug, name, logoUrl }} />
      <p className="mx-auto max-w-7xl px-4 pb-2 pt-10 text-center text-[12px] text-ink-400">
        {name} vende con la garantía de Win Condition TCG: stock reservado, código de pago y comprobante en cada compra.
      </p>
    </div>
  );
}
