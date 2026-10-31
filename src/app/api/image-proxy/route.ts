import { NextResponse } from "next/server";
import { clientKey, memoryRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Solo imágenes de los proveedores de cartas y del almacenamiento propio (los mismos que permite la política de seguridad). */
const HOSTS = [
  "cards.scryfall.io", "images.pokemontcg.io", "images.scrydex.com", "static.dotgg.gg", "api.myl.cl", "assets.tcgdex.net",
  "upload.wikimedia.org", "static.wikia.nocookie.net", "en.onepiece-cardgame.com", "play.pokemon.com", "assets.pokemon.com",
  "img.pokemondb.net", "res.cloudinary.com",
];
const allowed = (host: string) => HOSTS.includes(host) || host.endsWith(".supabase.co");
const MAX_BYTES = 6 * 1024 * 1024;

/**
 * Entrega una imagen de carta desde nuestro propio dominio. Lo usa la descarga del mazo en imagen: el navegador
 * no puede dibujar imágenes de otros sitios en un lienzo y luego guardarlas, pero sí las que vienen de aquí.
 * Lista cerrada de dominios (nunca una URL cualquiera), solo https, con tope de tamaño y de peticiones.
 */
export async function GET(req: Request) {
  if (!memoryRateLimit(clientKey(req, "image-proxy"), 240, 60).allowed) return new NextResponse(null, { status: 429 });
  let target: URL;
  try {
    target = new URL(new URL(req.url).searchParams.get("u") ?? "");
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (target.protocol !== "https:" || target.username || target.password || target.port || !allowed(target.hostname)) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    const res = await fetch(target, { redirect: "error", signal: AbortSignal.timeout(8000), headers: { accept: "image/*" } });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g|webp|gif|avif)/.test(type)) return new NextResponse(null, { status: 502 });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return new NextResponse(null, { status: 413 });
    return new NextResponse(buf, {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
