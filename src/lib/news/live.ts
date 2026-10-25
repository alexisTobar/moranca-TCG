import "server-only";
import { createHash } from "node:crypto";
import { parsePlayLatam, parsePokemonNews } from "./page-parser";
import { NEWS_MAX_AGE_DAYS, newsImage, newsKind } from "./policy";
import type { NewsRow } from "./query";

/** Read-only fallback: source dates and links survive even before the first cron sync. */
export async function liveSpanishNews(now = new Date()): Promise<NewsRow[]> {
  const sources = [
    {url:"https://www.playlatam.net/", name:"PlayLatam Chile", category:"POKEMON", parse:(html:string)=>parsePlayLatam(html,now)},
    {url:"https://play.pokemon.com/es-es/news/", name:"Play! Pokémon", category:"POKEMON", parse:parsePokemonNews},
  ];
  const batches = await Promise.all(sources.map(async source => {
    try {
      const response=await fetch(source.url,{next:{revalidate:259200},signal:AbortSignal.timeout(8000)});
      if(!response.ok)return [];
      return source.parse(await response.text()).filter(item=>item.publishedAt<=now && item.publishedAt>=new Date(now.getTime()-NEWS_MAX_AGE_DAYS*86400000) && (!item.eventAt||item.eventAt>=now)).slice(0,8).map(item=>({
        id:`source-${createHash("sha256").update(item.link).digest("hex").slice(0,20)}`,
        title:item.title,excerpt:item.excerptSource,category:source.category,
        imageUrl:newsImage(item.imageUrl),publishedAt:item.publishedAt,sourceName:source.name,
        sourceUrl:item.link,country:item.country??null,kind:item.kind??newsKind(item.title,item.excerptSource),eventAt:item.eventAt??null,
      }));
    } catch {return [];}
  }));
  return [...new Map(batches.flat().map(item=>[item.sourceUrl,item])).values()];
}
