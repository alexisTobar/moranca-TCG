import "server-only";
import { stripHtml, type FeedItem } from "./feed-parser";

export interface SourceItem extends FeedItem { country?: string; eventAt?: Date; kind?: string }

function attr(html: string, name: string) {
  return new RegExp(`\\b${name}=["']([^"']+)["']`, "i").exec(html)?.[1];
}
function absolute(value: string | undefined, base: string) {
  if (!value) return null;
  try { const url = new URL(value, base); return /^https?:$/.test(url.protocol) ? url.href : null; } catch { return null; }
}
function spanishDate(text: string): Date | null {
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const match = /(\d{1,2}) de (\w+) de (\d{4})/i.exec(text);
  if (!match) return null;
  const month = months.indexOf(match[2].toLowerCase());
  return month < 0 ? null : new Date(Date.UTC(Number(match[3]), month, Number(match[1]), 12));
}

export function parsePlayLatam(html: string, now = new Date()): SourceItem[] {
  return [...html.matchAll(/<article\b[^>]*class="tournament-card"[^>]*>[\s\S]*?<\/article>/gi)].flatMap(([block]) => {
    if (attr(block, "data-country") !== "CL" || !/^(TCG|OP|ONEPIECE)$/i.test(attr(block, "data-product") ?? "")) return [];
    const title = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(block)?.[1];
    const link = absolute(/href=["']([^"']*\/tournaments\/[^"']+)["']/i.exec(block)?.[1], "https://www.playlatam.net");
    const date = /(\d{2})\/(\d{2})\/(\d{4})/.exec(stripHtml(block));
    if (!title || !link || !date) return [];
    const eventAt = new Date(`${date[3]}-${date[2]}-${date[1]}T23:59:59-03:00`);
    if (!Number.isFinite(eventAt.getTime()) || eventAt < now) return [];
    const city = (attr(block, "data-city") ?? "").replace(/^CL\|/, "");
    return [{ title: stripHtml(title), link, publishedAt: now, eventAt, country: "CL", kind: "TOURNAMENT",
      excerptSource: `Torneo en ${city || "Chile"} el ${date[1]}/${date[2]}/${date[3]}. Consulta horario, cupos e inscripción con el organizador.`, imageUrl: null }];
  });
}

export function parsePokemonNews(html: string): SourceItem[] {
  return [...html.matchAll(/<li\b[^>]*class="[^"]*Cards__item"[^>]*>([\s\S]*?)<\/li>/gi)].flatMap(([, block]) => {
    const image = /<img\b[^>]*>/i.exec(block)?.[0] ?? "";
    const title = attr(image, "alt");
    const link = absolute(/href=["'](https:\/\/www\.pokemon\.com\/[^"']+)["']/i.exec(block)?.[1], "https://play.pokemon.com");
    const date = spanishDate(stripHtml(block));
    if (!title || !link || !date) return [];
    return [{ title, link, publishedAt: date, excerptSource: "Consulta el anuncio oficial de Play! Pokémon y los detalles para participar.", imageUrl: absolute(attr(image, "src"), "https://play.pokemon.com") }];
  });
}

export function parseOnePieceNews(html: string): SourceItem[] {
  return [...html.matchAll(/<li\b[^>]*class="topicDetail[^"']*"[^>]*>([\s\S]*?)<\/li>/gi)].flatMap(([, block]) => {
    const title = /class="js_topicTit"[^>]*>([\s\S]*?)<\/span>/i.exec(block)?.[1];
    const link = absolute(/<a\b[^>]*href=["']([^"']+)["']/i.exec(block)?.[1], "https://en.onepiece-cardgame.com");
    const date = /class="topicDate"[^>]*>([^<]+)</i.exec(block)?.[1];
    const publishedAt = date ? new Date(date) : null;
    if (!title || !link || !publishedAt || !Number.isFinite(publishedAt.getTime())) return [];
    return [{ title: stripHtml(title), link, publishedAt, excerptSource: "Official ONE PIECE CARD GAME announcement: check the original source for dates and details.", imageUrl: absolute(/<img\b[^>]*src=["']([^"']+)["']/i.exec(block)?.[1], "https://en.onepiece-cardgame.com") }];
  });
}
