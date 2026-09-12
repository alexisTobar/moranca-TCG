import "server-only";

export interface FeedItem {
  title: string;
  link: string;
  publishedAt: Date;
  excerptSource: string;
  imageUrl: string | null;
}

function unwrapCdata(text: string): string {
  const m = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(text);
  return m ? m[1] : text;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/** Extrae el contenido de texto de la primera ocurrencia de una etiqueta. */
function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  if (!m) return null;
  return decodeEntities(unwrapCdata(m[1]).trim());
}

/** Atom: <link rel="alternate" href="..."/> (o el primer <link href="..."/> si no hay rel=alternate). */
function extractAtomLink(block: string): string | null {
  const alt = /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i.exec(block);
  if (alt) return alt[1];
  const any = /<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i.exec(block);
  return any ? any[1] : null;
}

/** Descarta logos/íconos de "fuente" (ej. el badge "Source: Bandai") y se queda con la foto real. */
function isLikelyBadgeImage(src: string): boolean {
  return /logo|icon|badge|avatar/i.test(src);
}

function extractContentImage(...sources: Array<string | null>): string | null {
  for (const src of sources) {
    if (!src) continue;
    const matches = [...src.matchAll(/<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
    const real = matches.find((url) => !isLikelyBadgeImage(url));
    if (real) return real;
    if (matches[0]) return matches[0];
  }
  return null;
}

/** Boilerplate típico de WordPress/sindicación que no aporta como resumen. */
function stripSyndicationNoise(text: string): string {
  return text
    .replace(/Source:\s*\S+[^\n]*?(?:↗|→)?\s*/gi, "")
    .replace(/\bRelated\b[\s\S]*?(?=Read the full article|The post|$)/i, "")
    .replace(/Read the full article on the official site\s*(?:→|&rarr;)?\s*/gi, "")
    .replace(/The post .*? appeared first on .*?\.?$/i, "")
    // Descripciones genéricas del sitio (iguales en todos los ítems del feed,
    // no dicen nada del artículo puntual) — mejor dejar el excerpt vacío y que
    // el llamador use un fallback, que repetir esto en cada tarjeta.
    .replace(/The official .*? website\.?\s*Find out about the latest[^.]*\.?\s*Set sail[^.]*\.?/i, "")
    .trim();
}

export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptFrom(html: string, maxLen = 220): string {
  const text = stripSyndicationNoise(stripHtml(html));
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).replace(/\s+\S*$/, "")}…`;
}

/** Parsea RSS 2.0 (<item>) o Atom (<entry>). Tolerante: ítems que no calzan se omiten. */
export function parseFeed(xml: string): FeedItem[] {
  const isAtom = /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml);
  const blocks: string[] = [];
  const re = isAtom
    ? /<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi
    : /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) blocks.push(m[1]);

  const items: FeedItem[] = [];
  for (const block of blocks) {
    const title = extractTag(block, "title");
    const link = isAtom ? extractAtomLink(block) : extractTag(block, "link");
    const dateText =
      extractTag(block, "pubDate") ??
      extractTag(block, "published") ??
      extractTag(block, "updated");
    const contentEncoded = extractTag(block, "content:encoded");
    const description = extractTag(block, "description");
    const summary = extractTag(block, "summary");
    const content = extractTag(block, "content");

    if (!title || !link) continue;
    const publishedAt = dateText ? new Date(dateText) : new Date();
    if (Number.isNaN(publishedAt.getTime())) continue;

    items.push({
      title,
      link,
      publishedAt,
      // El teaser corto (description/summary) suele venir más limpio que el
      // content:encoded completo, que trae widgets/bloques de "relacionados".
      excerptSource: description || summary || content || contentEncoded || "",
      imageUrl: extractContentImage(contentEncoded, description, summary),
    });
  }
  return items;
}
