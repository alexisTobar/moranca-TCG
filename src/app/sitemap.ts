import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { GAME_LIST } from "@/lib/games";
import { safeQuery } from "@/lib/catalog";
import { activeStoreWhere } from "@/lib/store";
import { cardHref } from "@/lib/card-url";
import { siteUrl } from "@/lib/seo";

// Se regenera cada hora: las publicaciones cambian seguido, pero no hace falta al segundo.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const u = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"], lastModified: Date = now) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });

  const staticPages: MetadataRoute.Sitemap = [
    u("/", 1, "daily"),
    u("/cartas", 0.9, "hourly"),
    u("/cartas?type=SINGLE", 0.8, "daily"),
    u("/cartas?type=SEALED", 0.8, "daily"),
    u("/cartas?type=DECK", 0.8, "daily"),
    ...GAME_LIST.map((g) => u(`/cartas?game=${g.id}`, 0.8, "daily")),
    u("/tiendas", 0.8, "weekly"),
    u("/vendedores", 0.7, "daily"),
    u("/noticias", 0.6, "daily"),
    u("/ayuda", 0.5, "monthly"),
  ];

  const [listings, cards, sellers, stores, news] = await Promise.all([
    safeQuery(
      () =>
        prisma.listing.findMany({
          where: { status: "ACTIVE", stock: { gt: 0 } },
          select: { slug: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 5000,
        }),
      [] as Array<{ slug: string; updatedAt: Date }>
    ),
    safeQuery(
      () =>
        prisma.listing.findMany({
          where: { status: "ACTIVE", stock: { gt: 0 }, externalId: { not: null } },
          select: { game: true, externalId: true },
          distinct: ["game", "externalId"],
          take: 3000,
        }),
      [] as Array<{ game: string; externalId: string | null }>
    ),
    safeQuery(
      () =>
        prisma.user.findMany({
          where: { active: true, role: { in: ["SELLER", "ADMIN"] }, listings: { some: { status: "ACTIVE" } } },
          select: { slug: true, updatedAt: true },
        }),
      [] as Array<{ slug: string; updatedAt: Date }>
    ),
    safeQuery(
      () =>
        prisma.store.findMany({
          where: { ...activeStoreWhere(), seller: { active: true } },
          select: { updatedAt: true, seller: { select: { slug: true } } },
        }),
      [] as Array<{ updatedAt: Date; seller: { slug: string } }>
    ),
    safeQuery(
      () => prisma.newsItem.findMany({ select: { id: true, publishedAt: true }, orderBy: { publishedAt: "desc" }, take: 100 }),
      [] as Array<{ id: string; publishedAt: Date }>
    ),
  ]);

  return [
    ...staticPages,
    ...stores.map((s) => u(`/tienda/${s.seller.slug}`, 0.8, "daily", s.updatedAt)),
    ...sellers.map((s) => u(`/vendedor/${s.slug}`, 0.6, "weekly", s.updatedAt)),
    ...cards.filter((c) => c.externalId).map((c) => u(cardHref(c.game, c.externalId as string), 0.7, "daily")),
    ...listings.map((l) => u(`/producto/${l.slug}`, 0.6, "daily", l.updatedAt)),
    ...news.map((n) => u(`/noticias/${n.id}`, 0.4, "monthly", n.publishedAt)),
  ];
}
