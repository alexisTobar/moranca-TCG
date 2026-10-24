import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NEWS_MAX_AGE_DAYS } from "./policy";

export interface NewsRow {
  id: string; category: string; title: string; excerpt: string; imageUrl: string | null;
  sourceName: string; publishedAt: Date; country: string | null; kind: string; eventAt: Date | null;
}

export function eligibleNewsWhere(now = new Date()) {
  return {
    originalTitle: {not:null},
    publishedAt: {gte:new Date(now.getTime()-NEWS_MAX_AGE_DAYS*86400000),lte:now},
    OR: [{eventAt:null},{eventAt:{gte:now}}],
  } satisfies Prisma.NewsItemWhereInput;
}
export async function newsPage({ category, scope, kind, page = 1, take = 18 }: {
  category?: string; scope?: string; kind?: string; page?: number; take?: number;
} = {}) {
  const now = new Date();
  const clauses = [Prisma.sql`"originalTitle" IS NOT NULL AND "publishedAt" >= ${new Date(now.getTime() - NEWS_MAX_AGE_DAYS * 86400000)} AND "publishedAt" <= ${now} AND ("eventAt" IS NULL OR "eventAt" >= ${now})`];
  if (category) clauses.push(Prisma.sql`category::text = ${category}`);
  if (scope === "chile") clauses.push(Prisma.sql`country = 'CL'`);
  if (scope === "international") clauses.push(Prisma.sql`country IS DISTINCT FROM 'CL'`);
  if (kind) clauses.push(Prisma.sql`kind = ${kind}`);
  const where = Prisma.join(clauses, " AND ");
  const [count] = await prisma.$queryRaw<{total:number}[]>(Prisma.sql`SELECT count(*)::int AS total FROM "NewsItem" WHERE ${where}`);
  const pages = Math.max(1, Math.ceil(count.total / take));
  const current = Math.min(Math.max(1, page), pages);
  const items = await prisma.$queryRaw<NewsRow[]>(Prisma.sql`
    SELECT id, category::text, title, excerpt, "imageUrl", "sourceName", "publishedAt", country, kind, "eventAt"
    FROM "NewsItem" WHERE ${where}
    ORDER BY CASE WHEN country = 'CL' THEN 0 WHEN category::text IN ('POKEMON','ONEPIECE') THEN 1 ELSE 2 END,
      "publishedAt" DESC, id ASC LIMIT ${take} OFFSET ${(current-1)*take}`);
  return {items,total:count.total,pages,page:current};
}

export async function homeNews(): Promise<NewsRow[]> {
  const [local, onepiece, pokemon] = await Promise.all([
    newsPage({scope:"chile",take:4}),
    newsPage({category:"ONEPIECE",scope:"international",take:3}),
    newsPage({category:"POKEMON",scope:"international",take:3}),
  ]);
  return [...local.items,...onepiece.items,...pokemon.items];
}
