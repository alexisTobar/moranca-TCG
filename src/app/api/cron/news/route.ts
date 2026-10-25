import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseFeed, excerptFrom, stripHtml } from "@/lib/news/feed-parser";
import { parsePlayLatam, parsePokemonNews, parseOnePieceNews, type SourceItem } from "@/lib/news/page-parser";
import { translateToSpanish } from "@/lib/news/translate";
import { NEWS_SOURCES } from "@/lib/news/sources";
import { NEWS_INTERVAL_MS, NEWS_MAX_AGE_DAYS, newsKind, newsImage, isChileNews } from "@/lib/news/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run() {
  const now = new Date();
  const minDate = new Date(now.getTime() - NEWS_MAX_AGE_DAYS * 86_400_000);
  const summary = await Promise.all(NEWS_SOURCES.map(async source => {
    let saved = 0, skipped = 0;
    try {
      const response = await fetch(source.url, {headers:{"User-Agent":"TCG Cardeck/1.0"}, cache:"no-store", signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.text();
      const items: SourceItem[] = source.format === "playlatam" ? parsePlayLatam(body, now)
        : source.format === "pokemon" ? parsePokemonNews(body)
        : source.format === "onepiece" ? parseOnePieceNews(body) : parseFeed(body);
      if (!items.length && (source.format !== "playlatam" || !body.includes('id="tournament-list"'))) throw new Error("La fuente no entregó artículos reconocibles");
      const eligible = items.filter(item => item.publishedAt >= minDate && item.publishedAt <= now && /^https?:\/\//i.test(item.link));
      eligible.sort((a,b) => source.format === "playlatam" ? (a.eventAt!.getTime()-b.eventAt!.getTime()) : b.publishedAt.getTime()-a.publishedAt.getTime());
      for (const item of eligible.slice(0, source.limit)) {
        const originalTitle = stripHtml(item.title);
        const excerpt = excerptFrom(item.excerptSource) || `Anuncio de ${source.name}.`;
        const existing = await prisma.newsItem.findUnique({where:{sourceUrl:item.link}});
        const unchanged = existing?.originalTitle === originalTitle;
        const title = unchanged ? existing.title : source.language === "es" ? originalTitle : await translateToSpanish(originalTitle);
        if (!title) { skipped++; continue; }
        const excerptEs = unchanged ? existing.excerpt : source.language === "es" ? excerpt : await translateToSpanish(excerpt);
        if (!excerptEs) { skipped++; continue; }
        const kind = item.kind ?? newsKind(originalTitle, excerpt);
        const data = {
          title:stripHtml(title), originalTitle, excerpt:stripHtml(excerptEs),
          category: /one piece/i.test(originalTitle) ? "ONEPIECE" as const : /pok[eé]mon/i.test(originalTitle) ? "POKEMON" as const : source.category,
          sourceName:source.name, country:item.country ?? source.country ?? (isChileNews(originalTitle, excerpt) ? "CL" : null),
          kind, eventAt:item.eventAt ?? null, imageUrl:newsImage(item.imageUrl),
        };
        await prisma.newsItem.upsert({
          where:{sourceUrl:item.link},
          create:{...data,sourceUrl:item.link,publishedAt:item.publishedAt},
          // Tournament discovery date stays stable on subsequent syncs.
          update:{...data, ...(item.eventAt ? {} : {publishedAt:item.publishedAt})},
        });
        saved++;
      }
      return {source:source.name,saved,skipped};
    } catch(error) {
      return {source:source.name,saved,skipped,error:(error as Error).message};
    }
  }));
  await prisma.newsItem.deleteMany({where:{OR:[{publishedAt:{lt:minDate}},{eventAt:{lt:now}}]}});
  return summary;
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({error:"No autorizado"},{status:401});
  }
  const token = randomUUID();
  let claimed = false;
  try {
    const now = new Date();
    const day = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
    await prisma.newsSyncState.upsert({where:{id:"news"},create:{id:"news"},update:{}});
    const lease = await prisma.newsSyncState.updateMany({
      where:{id:"news",AND:[
        {OR:[{completedAt:null},{completedAt:{lte:new Date(day.getTime()-NEWS_INTERVAL_MS)}}]},
        {OR:[{leaseUntil:null},{leaseUntil:{lt:now}}]},
      ]},
      data:{leaseToken:token,leaseUntil:new Date(now.getTime()+10*60*1000)},
    });
    if (!lease.count) return NextResponse.json({ok:true,skipped:true,reason:"Actualización reciente o en curso"});
    claimed = true;
    const summary = await run();
    if (summary.every(source => source.error || (!source.saved && source.skipped > 0))) {
      return NextResponse.json({ok:false,error:"No se pudieron actualizar las fuentes; se reintentará.",summary},{status:503});
    }
    await prisma.newsSyncState.updateMany({where:{id:"news",leaseToken:token},data:{completedAt:day}});
    return NextResponse.json({ok:true,summary});
  } catch(error) {
    console.error("[news:refresh]",error);
    return NextResponse.json({error:"No se pudieron actualizar las noticias"},{status:503});
  } finally {
    if (claimed) await prisma.newsSyncState.updateMany({where:{id:"news",leaseToken:token},data:{leaseUntil:null,leaseToken:null}}).catch(()=>{});
  }
}
export async function GET(req: Request) { return POST(req); }
