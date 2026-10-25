import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NEWS_MAX_AGE_DAYS } from "./policy";

export interface NewsRow {
  id: string; category: string; title: string; excerpt: string; imageUrl: string | null;
  sourceName: string; publishedAt: Date; country: string | null; kind: string; eventAt: Date | null; sourceUrl?: string;
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
  const results = await Promise.allSettled([
    newsPage({scope:"chile",take:4}),
    newsPage({category:"ONEPIECE",scope:"international",take:3}),
    newsPage({category:"POKEMON",scope:"international",take:3}),
  ]);
  const items=results.flatMap(result=>result.status==="fulfilled"?result.value.items:[]);
  if(items.length)return balanceHomeNews(items);
  const {liveSpanishNews}=await import("./live");
  return balanceHomeNews(await liveSpanishNews());
}

/** Show Chile and international coverage together instead of filling the home with one source. */
export function balanceHomeNews(items:NewsRow[]):NewsRow[] {
  const local=items.filter(item=>item.country==="CL");
  const global=items.filter(item=>item.country!=="CL");
  const featured=[...local.slice(0,2),global.find(item=>item.category==="ONEPIECE")??global.find(item=>item.category==="POKEMON"),...global,...local.slice(2)];
  return [...new Map(featured.filter((item):item is NewsRow=>!!item).map(item=>[item.id,item])).values()].slice(0,10);
}

export async function publicNewsPage(filters:Parameters<typeof newsPage>[0]={}) {
  try {
    const result=await newsPage(filters);
    if(result.total)return {...result,unavailable:false};
  } catch { /* A missing first sync or an unavailable database must not hide source links. */ }
  const {liveSpanishNews}=await import("./live");
  const rows=await liveSpanishNews();
  const items=rows.filter(item=>(!filters.category||item.category===filters.category)&&(!filters.scope||(filters.scope==="chile"?item.country==="CL":item.country!=="CL"))&&(!filters.kind||item.kind===filters.kind));
  const take=filters.take??18,pages=Math.max(1,Math.ceil(items.length/take)),page=Math.min(Math.max(1,filters.page??1),pages);
  return {items:items.slice((page-1)*take,page*take),total:items.length,pages,page,unavailable:!rows.length};
}
