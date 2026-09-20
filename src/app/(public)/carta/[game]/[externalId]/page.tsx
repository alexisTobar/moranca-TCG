import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ImageOff, TrendingUp } from "lucide-react";
import { clp } from "@/lib/format";
import { CONDITIONS, LANGUAGES, gameName, isGameId } from "@/lib/games";
import { safeQuery } from "@/lib/catalog";
import {
  computeStats,
  getCardOffers,
  getCardSample,
  getPriceHistory,
  getRecentSales,
  recordSnapshot,
  type CardOffer,
} from "@/lib/card-market";
import { externalPrice } from "@/lib/providers/price-by-id";
import { formatSales, getSellerStats } from "@/lib/seller-stats";
import { REGION_COOKIE, isValidRegion, sellerRegion } from "@/lib/location";
import { GameChip } from "@/components/GameChip";
import { LocationPicker } from "@/components/LocationPicker";
import { CardSellers, type SellerOfferRow } from "@/components/card/CardSellers";
import { PriceChart } from "@/components/card/PriceChart";

export const dynamic = "force-dynamic";

const langLabel = (code: string | null) =>
  code === "*"
    ? "Todos"
    : !code
      ? "Sin idioma"
      : (LANGUAGES.find((l) => l.value === code)?.label ?? code);

type Params = Promise<{ game: string; externalId: string }>;

async function load(params: Params) {
  const { game, externalId: raw } = await params;
  if (!isGameId(game)) return null;
  const externalId = decodeURIComponent(raw);
  const sample = await safeQuery(() => getCardSample(game, externalId), null);
  if (!sample) return null;
  return { game, externalId, sample };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: "Carta no encontrada" };
  return {
    title: `${data.sample.title} · vendedores y precios`,
    description: `Compara precios y vendedores de ${data.sample.title} (${gameName(data.game)}) en Win Condition TCG.`,
    openGraph: { images: data.sample.imageUrl ? [data.sample.imageUrl] : undefined },
  };
}

export default async function CardPage({ params }: { params: Params }) {
  const data = await load(params);
  if (!data) notFound();
  const { game, externalId, sample } = data;

  const offers = await safeQuery(() => getCardOffers(game, externalId), [] as CardOffer[]);
  const stats = computeStats(offers);

  // Guarda la foto de precios de hoy: así el historial se arma solo, sin depender de nada más.
  await safeQuery(() => recordSnapshot(game, externalId, stats), undefined);

  const [history, sales, ext, sellerStats, cookieStore] = await Promise.all([
    safeQuery(() => getPriceHistory(game, externalId), {}),
    safeQuery(() => getRecentSales(game, externalId, 8), []),
    externalPrice(game, externalId),
    getSellerStats(offers.map((o) => o.seller.id)),
    cookies(),
  ]);

  const regionCookie = cookieStore.get(REGION_COOKIE)?.value;
  const buyerRegion = isValidRegion(regionCookie) ? regionCookie : null;

  const rows: SellerOfferRow[] = offers.map((o) => {
    const st = sellerStats.get(o.seller.id);
    const region = sellerRegion(o.seller);
    return {
      id: o.id,
      slug: o.slug,
      price: o.price,
      listPrice: o.listPrice,
      stock: o.stock,
      condition: o.condition,
      language: o.language,
      isFoil: o.isFoil,
      seller: {
        id: o.seller.id,
        name: o.seller.name,
        slug: o.seller.slug,
        avatarUrl: o.seller.avatarUrl,
        city: o.seller.city,
        region,
        offersShipping: o.seller.offersShipping,
        offersPickup: o.seller.offersPickup,
        rating: st?.rating ?? 0,
        reviews: st?.reviews ?? 0,
        sales: st?.sales ?? 0,
        salesLabel: formatSales(st?.sales ?? 0),
        near: Boolean(buyerRegion && region === buyerRegion),
      },
    };
  });

  const sellerCount = new Set(offers.map((o) => o.seller.id)).size;
  const totalStock = offers.reduce((a, o) => a + o.stock, 0);
  const languageLabels = Object.fromEntries(
    ["*", ...Object.keys(history).filter((k) => k !== "*")].map((k) => [k, langLabel(k === "" ? null : k)])
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-400">
        <Link href="/" className="hover:text-carbon">Inicio</Link>
        <span>/</span>
        <Link href="/cartas" className="hover:text-carbon">Catálogo</Link>
        <span>/</span>
        <Link href={`/cartas?game=${game}`} className="hover:text-carbon">{gameName(game)}</Link>
        <span>/</span>
        <span className="truncate text-ink-300">{sample.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        {/* IMAGEN Y FICHA */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <div className="relative mx-auto aspect-[63/88] max-w-[340px] overflow-hidden rounded-2xl border border-ink-700 bg-ink-950 tcg-card-shadow">
            {sample.imageUrl ? (
              <Image src={sample.imageUrl} alt={sample.title} fill sizes="340px" className="object-contain" priority unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-700">
                <ImageOff className="h-14 w-14" strokeWidth={1.5} />
              </div>
            )}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            {[
              ["Juego", gameName(game)],
              ["Edición", sample.setName],
              ["Número", sample.cardNumber],
              ["Rareza", sample.rarity],
              ["Color", sample.color],
              ["Ilustrador", sample.illustrator],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="rounded-lg border border-ink-800 bg-ink-900/60 px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-wider text-ink-400">{k}</dt>
                  <dd className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-ink-200">{v}</dd>
                </div>
              ))}
          </dl>
        </div>

        {/* DETALLE */}
        <div className="min-w-0 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <GameChip game={game} />
              <span className="text-[12px] text-ink-400">
                {sellerCount} {sellerCount === 1 ? "vendedor" : "vendedores"} · {totalStock}{" "}
                {totalStock === 1 ? "unidad" : "unidades"}
              </span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-carbon sm:text-4xl">
              {sample.title}
            </h1>

            {stats.all ? (
              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Desde</p>
                  <p className="font-display text-4xl font-bold text-carbon">{clp(stats.all.min)}</p>
                </div>
                <a href="#vendedores" className="btn btn-primary">Ver los {sellerCount} vendedores</a>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-ink-700 p-5 text-[14px] text-ink-400">
                Por ahora nadie tiene esta carta disponible. Puedes ver su historial de precio y sus últimas
                ventas más abajo.
              </p>
            )}

            <div className="mt-4">
              <LocationPicker region={buyerRegion} />
            </div>
          </div>

          {/* REFERENCIA DE PRECIO */}
          <section className="rounded-3xl card-surface p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-carbon">Referencia de precio</h2>
            <p className="mt-0.5 text-[12px] text-ink-400">
              Calculado con las ofertas activas de esta carta. “Mercado” es el precio del medio.
            </p>
            {stats.byLanguage.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-[13px]">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      <th className="pb-2 pr-3">Idioma</th>
                      <th className="pb-2 pr-3">Mín.</th>
                      <th className="pb-2 pr-3">Mercado</th>
                      <th className="pb-2 pr-3">Máx.</th>
                      <th className="pb-2 text-right">Ofertas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800">
                    {stats.byLanguage.map((s) => (
                      <tr key={s.language}>
                        <td className="py-2.5 pr-3 font-semibold text-ink-200">{langLabel(s.language || null)}</td>
                        <td className="py-2.5 pr-3 font-bold text-emerald-600">{clp(s.min)}</td>
                        <td className="py-2.5 pr-3 font-bold text-carbon">{clp(s.market)}</td>
                        <td className="py-2.5 pr-3 text-ink-300">{clp(s.max)}</td>
                        <td className="py-2.5 text-right text-ink-400">{s.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-[13px] text-ink-400">Todavía no hay ofertas para calcular un precio.</p>
            )}

            {ext && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-ink-900 px-4 py-3 text-[12px] text-ink-300">
                <TrendingUp className="h-4 w-4 text-brand-600" strokeWidth={2} />
                <span>
                  Mercado internacional ({ext.source}):{" "}
                  <strong className="text-carbon">{ext.clp != null ? clp(ext.clp) : "—"}</strong>
                  {ext.usd != null && <span className="text-ink-400"> · US${ext.usd.toFixed(2)}</span>}
                  {ext.clpFoil != null && (
                    <span className="text-ink-400"> · Foil {clp(ext.clpFoil)}</span>
                  )}
                </span>
                <span className="text-ink-400">Dólar ${ext.usdClp.toLocaleString("es-CL")}</span>
              </div>
            )}
          </section>

          {/* HISTORIAL */}
          <section className="rounded-3xl card-surface p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-carbon">Historial de precio</h2>
            {Object.keys(history).length > 0 ? (
              <div className="mt-3">
                <PriceChart history={history} languageLabels={languageLabels} />
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-ink-400">
                Aún no hay registros. Guardamos el precio de cada carta todos los días.
              </p>
            )}
          </section>

          {/* ÚLTIMAS VENTAS */}
          <section className="rounded-3xl card-surface p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-carbon">Últimas ventas</h2>
            {sales.length > 0 ? (
              <ul className="mt-3 divide-y divide-ink-800 text-[13px]">
                {sales.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-ink-400">
                      {s.date.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "America/Santiago" })}
                    </span>
                    <span className="flex-1 text-ink-300">
                      {[langLabel(s.language), CONDITIONS.find((c) => c.value === s.condition)?.value, s.isFoil ? "Foil" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span className="text-ink-400">{s.quantity}x</span>
                    <span className="font-bold text-carbon">{clp(s.unitPrice)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] text-ink-400">
                Todavía no se registran ventas de esta carta en Win Condition.
              </p>
            )}
          </section>
        </div>
      </div>

      {rows.length > 0 && (
        <div id="vendedores" className="mt-10 scroll-mt-28">
          <CardSellers
            offers={rows}
            buyerRegion={buyerRegion}
            imageUrl={sample.imageUrl}
            title={sample.title}
            game={game}
          />
        </div>
      )}
    </div>
  );
}
