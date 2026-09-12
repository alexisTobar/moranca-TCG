import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseFeed, excerptFrom, stripHtml } from "@/lib/news/feed-parser";
import { NEWS_SOURCES } from "@/lib/news/sources";
import { GAMES } from "@/lib/games";
import type { NewsCategory } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PER_SOURCE = 15;
const MAX_AGE_DAYS = 90;
/** Un ítem más viejo que esto no vale la pena insertarlo (fuente desactualizada). */
const MAX_ITEM_AGE_DAYS = 30;

const FALLBACK_IMAGE: Record<NewsCategory, string | null> = {
  MAGIC: GAMES.magic.cardImage,
  POKEMON: GAMES.pokemon.cardImage,
  ONEPIECE: GAMES.onepiece.cardImage,
  MYL: GAMES.myl.cardImage,
  GENERAL: null,
};

/**
 * ICv2 es un feed general de "cultura geek" (cómics, miniaturas, RPGs, TCGs
 * todo junto) — se filtra a solo lo relevante para cartas coleccionables, y se
 * reclasifica por juego cuando el título lo menciona (así un anuncio de
 * torneo de Pokémon en ICv2 aparece bajo "Pokémon", no en "Torneos" genérico).
 */
const GAME_KEYWORDS: Array<{ category: NewsCategory; pattern: RegExp }> = [
  { category: "POKEMON", pattern: /pok[eé]mon/i },
  { category: "MAGIC", pattern: /magic[:\s]+the\s+gathering|\bmtg\b/i },
  { category: "ONEPIECE", pattern: /one piece/i },
];
const TCG_RELEVANCE = /trading card|tcg\b|card game|tournament|championship|booster|expansion set/i;

function classifyGeneralItem(title: string, excerpt: string): NewsCategory | null {
  const text = `${title} ${excerpt}`;
  for (const { category, pattern } of GAME_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return TCG_RELEVANCE.test(text) ? "GENERAL" : null;
}

async function fetchWithRetry(url: string, attempts = 2): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "DreamDeckTCG/1.0 (+https://dreamdecktcg.cl)" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`${url} -> ${res.status}`);
        return await res.text();
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastError;
}

async function run() {
  const summary: Array<{ source: string; inserted: number; skipped: number; error?: string }> = [];
  const minPublishedAt = new Date(Date.now() - MAX_ITEM_AGE_DAYS * 86_400_000);

  for (const source of NEWS_SOURCES) {
    let inserted = 0;
    let skipped = 0;
    try {
      const xml = await fetchWithRetry(source.url);
      const items = parseFeed(xml).slice(0, MAX_PER_SOURCE);

      for (const item of items) {
        if (item.publishedAt < minPublishedAt) {
          skipped++;
          continue;
        }

        const excerpt = excerptFrom(item.excerptSource) || `Novedad de ${source.name}.`;
        let category: NewsCategory = source.category;
        if (source.category === "GENERAL") {
          const reclassified = classifyGeneralItem(stripHtml(item.title), excerpt);
          if (!reclassified) {
            skipped++;
            continue;
          }
          category = reclassified;
        }

        const existing = await prisma.newsItem.findUnique({
          where: { sourceUrl: item.link },
          select: { id: true },
        });
        if (existing) {
          skipped++;
          continue;
        }

        await prisma.newsItem.create({
          data: {
            category,
            title: stripHtml(item.title),
            excerpt,
            imageUrl: item.imageUrl ?? FALLBACK_IMAGE[category],
            sourceUrl: item.link,
            sourceName: source.name,
            publishedAt: item.publishedAt,
          },
        });
        inserted++;
      }
      summary.push({ source: source.name, inserted, skipped });
    } catch (error) {
      summary.push({ source: source.name, inserted, skipped, error: String(error) });
    }
  }

  const { count: deleted } = await prisma.newsItem.deleteMany({
    where: { publishedAt: { lt: new Date(Date.now() - MAX_AGE_DAYS * 86_400_000) } },
  });

  return { summary, deleted };
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await run();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return POST(req);
}
