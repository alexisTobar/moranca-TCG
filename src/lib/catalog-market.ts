import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { CARD_IDENTITY_SQL } from "./card-identity";
import { LISTING_CARD_SELECT } from "./catalog";

export interface MarketFilters {
  type: "SINGLE" | "SEALED" | "DECK" | "ACCESSORY"; game?: string; q?: string;
  accessoryCategory?: string; condition?: string; language?: string; min?: number; max?: number; sort: string; page: number;
}
const PRICE = Prisma.sql`LEAST(l.price, COALESCE(l."offerPrice", l.price))`;

/** Filtering, cheapest-offer selection, deduplication and pagination happen in PostgreSQL. */
export async function catalogMarket(filters: MarketFilters) {
  const clauses = [Prisma.sql`l.status = 'ACTIVE' AND l.type = ${filters.type}::"ListingType" AND u.active = true AND u.role IN ('SELLER','ADMIN')`];
  if (filters.accessoryCategory && filters.type === "ACCESSORY") clauses.push(Prisma.sql`l."accessoryCategory" = ${filters.accessoryCategory}`);
  if (filters.game) clauses.push(Prisma.sql`l.game = ${filters.game}`);
  if (filters.condition) clauses.push(Prisma.sql`l.condition = ${filters.condition}`);
  if (filters.language) clauses.push(Prisma.sql`l.language = ${filters.language}`);
  if (filters.min !== undefined) clauses.push(Prisma.sql`${PRICE} >= ${filters.min}`);
  if (filters.max !== undefined) clauses.push(Prisma.sql`${PRICE} <= ${filters.max}`);
  if (filters.q) {
    const q = `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`;
    clauses.push(Prisma.sql`(l.title ILIKE ${q} OR l."setName" ILIKE ${q} OR l.description ILIKE ${q} OR EXISTS (SELECT 1 FROM "DeckCard" d WHERE d."listingId" = l.id AND d.name ILIKE ${q}))`);
  }
  const identity = filters.type === "SINGLE" ? CARD_IDENTITY_SQL : Prisma.sql`l.id`;
  const cte = Prisma.sql`WITH eligible AS (
    SELECT l.id, l.game, l.title, l."sellerId", l.stock, l."createdAt", ${PRICE} AS price, ${identity} AS identity
    FROM "Listing" l JOIN "User" u ON u.id = l."sellerId" WHERE ${Prisma.join(clauses, " AND ")}
  ), ranked AS (
    SELECT *, row_number() OVER (PARTITION BY game, identity ORDER BY (stock > 0) DESC, price ASC, id ASC) AS rank
    FROM eligible
  ), summary AS (
    SELECT game, identity, count(DISTINCT "sellerId") FILTER (WHERE stock > 0)::int AS sellers,
      COALESCE(sum(GREATEST(stock,0)),0)::int AS "totalStock", max("createdAt") AS newest
    FROM eligible GROUP BY game, identity
  ), cards AS (
    SELECT r.id, r.title, r.price, r.game, r.identity, s.sellers, s."totalStock", s.newest
    FROM ranked r JOIN summary s ON r.game=s.game AND r.identity=s.identity WHERE r.rank=1
  )`;
  const [count] = await prisma.$queryRaw<{ total: number }[]>(Prisma.sql`${cte} SELECT count(*)::int AS total FROM cards`);
  const total = count.total;
  const pages = Math.max(1, Math.ceil(total / 24));
  const page = Math.min(filters.page, pages);
  const sorting = filters.sort === "precio-asc" ? Prisma.sql`price ASC` : filters.sort === "precio-desc" ? Prisma.sql`price DESC` : filters.sort === "nombre" ? Prisma.sql`title ASC` : Prisma.sql`newest DESC`;
  const groups = await prisma.$queryRaw<{ id: string; identity: string; sellers: number; totalStock: number }[]>(Prisma.sql`${cte}
    SELECT id, identity, sellers, "totalStock" FROM cards ORDER BY ("totalStock" > 0) DESC, ${sorting}, id ASC LIMIT 24 OFFSET ${(page-1)*24}`);
  const rows = await prisma.listing.findMany({ where: { id: { in: groups.map(g=>g.id) } }, select: LISTING_CARD_SELECT });
  const byId = new Map(rows.map(r=>[r.id,r]));
  const listings = groups.flatMap(group => { const row=byId.get(group.id); return row ? [{...row, market: filters.type === "SINGLE" ? {identity:group.identity, sellers:group.sellers, stock:group.totalStock} : undefined}] : []; });
  return { total, pages, page, listings };
}
