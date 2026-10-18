import { NextResponse } from "next/server";
import { catalogMarket } from "@/lib/catalog-market";
import { cardMarketHref, effectivePrice } from "@/lib/card-identity";
import { memoryRateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sugerencias del buscador: publicaciones activas cuyo nombre o edición
 * coincide con lo que se va escribiendo. Es público (lo usa cualquier visitante)
 * y solo devuelve datos que ya se muestran en el catálogo.
 */
export async function GET(req: Request) {
  const limiter = memoryRateLimit(clientKey(req, "suggest"), 90, 60);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiadas búsquedas, espera un momento." }, { status: 429 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ ok: true, results: [], total: 0 });

  try {
    const requested = new URL(req.url).searchParams.get("type");
    const type = requested === "SEALED" ? "SEALED" : requested === "DECK" ? "DECK" : "SINGLE";
    const {listings, total} = await catalogMarket({type,q,sort:"recientes",page:1});
    const results = listings.slice(0,7).map(r=>({slug:r.slug,href:r.market ? cardMarketHref(r.game,r.market.identity) : '/producto/'+r.slug,title:r.title,game:r.game,type:r.type,imageUrl:r.imageUrl,price:effectivePrice(r.price,r.offerPrice),stock:r.market?.stock ?? r.stock,setName:r.setName,condition:r.condition,isFoil:r.isFoil}));
    return NextResponse.json({ ok: true, results, total });
  } catch (error) {
    console.error("[search/suggest]", error);
    return NextResponse.json({ ok: false, error: "No se pudo consultar el catálogo", results: [], total: 0 }, {status:503});
  }
}
