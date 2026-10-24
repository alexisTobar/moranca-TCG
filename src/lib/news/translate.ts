import "server-only";

/**
 * Traduce texto corto (título/extracto) de inglés a español usando MyMemory
 * (gratis, sin API key). Si falla o se corta el tiempo, devuelve el texto
 * null para reintentar en la siguiente actualización sin publicar texto en inglés.
 */
export async function translateToSpanish(text: string): Promise<string | null> {
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
      if (!res.ok) return null;
      const json = (await res.json()) as { responseStatus?: number; responseData?: { translatedText?: string } };
      const translated = json.responseData?.translatedText?.trim();
      // MyMemory a veces devuelve el mismo texto sin traducir cuando no
      // reconoce el idioma origen, o un mensaje de cuota agotada.
      if (json.responseStatus !== 200 || !translated || translated === q || /MYMEMORY WARNING|QUOTA|INVALID LANGUAGE|USED ALL AVAILABLE/i.test(translated)) return null;
      return translated;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}
