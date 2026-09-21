import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { clp } from "@/lib/format";
import { gameName } from "@/lib/games";
import { ProductDetail, getProductListing } from "@/components/product/ProductDetail";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getProductListing(slug);
  if (!listing) return { title: "Publicación no encontrada" };
  return {
    title: listing.title,
    description:
      listing.description ??
      `${listing.title} — ${gameName(listing.game)} en Win Condition TCG por ${clp(listing.price)}.`,
    alternates: { canonical: `/producto/${slug}` },
    openGraph: {
      images: listing.imageUrl ? [listing.imageUrl] : undefined,
      title: listing.title,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getProductListing(slug);
  if (!listing || listing.status === "DRAFT") notFound();
  return <ProductDetail listing={listing} />;
}
