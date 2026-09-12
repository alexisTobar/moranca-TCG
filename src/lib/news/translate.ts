import "server-only";

/**
 * Traduce texto corto (título/extracto) de inglés a español usando MyMemory
 * (gratis, sin API key). Si falla o se corta el tiempo, devuelve el texto
 * original en vez de romper la importación de esa noticia.
 */
export async function translateToSpanish(text: string): Promise<string> {
  const clean = text.trim();
  if (!clean) return clean;
  // MyMemory acepta hasta ~500 caracteres por consulta en el plan gratis.
  const q = clean.slice(0, 490);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|es`,
        { signal: controller.signal, cache: "no-store" }
      );
      if (!res.ok) return clean;
      const json = (await res.json()) as { responseData?: { translatedText?: string } };
      const translated = json.responseData?.translatedText?.trim();
      // MyMemory a veces devuelve el mismo texto sin traducir cuando no
      // reconoce el idioma origen, o un mensaje de cuota agotada.
      if (!translated || /MYMEMORY WARNING/i.test(translated)) return clean;
      return translated;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return clean;
  }
}
