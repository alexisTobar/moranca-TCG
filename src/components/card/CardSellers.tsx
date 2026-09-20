"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { MapPin, ShoppingBag, Star, Store, Truck } from "lucide-react";
import { useCart, type CartItem } from "@/components/cart/CartProvider";
import { clp } from "@/lib/format";

export interface SellerOfferRow {
  id: string;
  slug: string;
  price: number;
  listPrice: number;
  stock: number;
  condition: string | null;
  language: string | null;
  isFoil: boolean;
  seller: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    city: string | null;
    region: string | null;
    offersShipping: boolean;
    offersPickup: boolean;
    rating: number;
    reviews: number;
    salesLabel: string | null;
    sales: number;
    near: boolean;
  };
}

type Delivery = "all" | "shipping" | "pickup";
type Sort = "price-asc" | "price-desc" | "rating" | "sales";

const LANGUAGE_LABEL: Record<string, string> = {
  ES: "Español",
  EN: "Inglés",
  JP: "Japonés",
  PT: "Portugués",
  IT: "Italiano",
  FR: "Francés",
  DE: "Alemán",
};

function AddButton({
  row,
  base,
}: {
  row: SellerOfferRow;
  base: Omit<CartItem, "quantity" | "listingId" | "slug" | "price" | "originalPrice" | "maxStock" | "sellerId" | "sellerName">;
}) {
  const { add, items, flyToCart } = useCart();
  const inCart = items.find((i) => i.listingId === row.id)?.quantity ?? 0;
  const soldOut = inCart >= row.stock;

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={(e) => {
        add(
          {
            ...base,
            listingId: row.id,
            slug: row.slug,
            price: row.price,
            originalPrice: row.price < row.listPrice ? row.listPrice : null,
            maxStock: row.stock,
            sellerId: row.seller.id,
            sellerName: row.seller.name,
          },
          1
        );
        flyToCart(base.imageUrl, e.currentTarget);
      }}
      className="btn btn-primary btn-sm"
    >
      <ShoppingBag className="h-4 w-4" strokeWidth={2} />
      {soldOut ? "En tu carro" : "Agregar"}
    </button>
  );
}

/** Lista de todos los vendedores de una carta, con filtros de idioma, entrega y cercanía. */
export function CardSellers({
  offers,
  buyerRegion,
  imageUrl,
  title,
  game,
}: {
  offers: SellerOfferRow[];
  buyerRegion: string | null;
  imageUrl: string | null;
  title: string;
  game: string;
}) {
  const [language, setLanguage] = useState("all");
  const [delivery, setDelivery] = useState<Delivery>("all");
  const [nearOnly, setNearOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("price-asc");

  const languages = useMemo(
    () => [...new Set(offers.map((o) => o.language).filter((l): l is string => Boolean(l)))],
    [offers]
  );

  const rows = useMemo(() => {
    const filtered = offers.filter(
      (o) =>
        (language === "all" || o.language === language) &&
        (delivery === "all" ||
          (delivery === "shipping" ? o.seller.offersShipping : o.seller.offersPickup)) &&
        (!nearOnly || o.seller.near)
    );
    const cmp: Record<Sort, (a: SellerOfferRow, b: SellerOfferRow) => number> = {
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      rating: (a, b) => b.seller.rating - a.seller.rating || b.seller.reviews - a.seller.reviews || a.price - b.price,
      sales: (a, b) => b.seller.sales - a.seller.sales || a.price - b.price,
    };
    return [...filtered].sort(cmp[sort]);
  }, [offers, language, delivery, nearOnly, sort]);

  const base = { title, imageUrl, game, type: "SINGLE" };
  const sellerCount = new Set(offers.map((o) => o.seller.id)).size;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold text-carbon">Vendedores</h2>
          <p className="text-[13px] text-ink-400">
            {sellerCount} {sellerCount === 1 ? "persona la vende" : "personas la venden"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-400">
          Ordenar por
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input !w-auto !py-1.5 !text-[12px]">
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="rating">Mejor calificación</option>
            <option value="sales">Más ventas</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" data-active={language === "all"} onClick={() => setLanguage("all")} className="pill !px-3 !py-1">
            Todos los idiomas
          </button>
          {languages.map((l) => (
            <button key={l} type="button" data-active={language === l} onClick={() => setLanguage(l)} className="pill !px-3 !py-1">
              {LANGUAGE_LABEL[l] ?? l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" data-active={delivery === "all"} onClick={() => setDelivery("all")} className="pill !px-3 !py-1">
            Todas las entregas
          </button>
          <button type="button" data-active={delivery === "shipping"} onClick={() => setDelivery("shipping")} className="pill !px-3 !py-1">
            <Truck className="h-3.5 w-3.5" strokeWidth={2} />
            Envío
          </button>
          <button type="button" data-active={delivery === "pickup"} onClick={() => setDelivery("pickup")} className="pill !px-3 !py-1">
            <Store className="h-3.5 w-3.5" strokeWidth={2} />
            Retiro en persona
          </button>
        </div>
        <button
          type="button"
          data-active={nearOnly}
          disabled={!buyerRegion}
          title={buyerRegion ? `Vendedores de ${buyerRegion}` : "Elige tu región arriba para usar este filtro"}
          onClick={() => setNearOnly((v) => !v)}
          className="pill !px-3 !py-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
          Cerca mío
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-ink-700 p-8 text-center text-[13px] text-ink-400">
          Ningún vendedor coincide con esos filtros.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-ink-800 overflow-hidden rounded-2xl card-surface">
          {rows.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
              <Link
                href={`/vendedor/${o.seller.slug}`}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-carbon font-display text-lg font-bold text-white"
              >
                {o.seller.avatarUrl ? (
                  <Image src={o.seller.avatarUrl} alt={o.seller.name} fill sizes="44px" className="object-cover" unoptimized />
                ) : (
                  o.seller.name.charAt(0).toUpperCase()
                )}
              </Link>

              <div className="min-w-0 flex-1 basis-56">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <Link href={`/vendedor/${o.seller.slug}`} className="truncate text-[14px] font-bold text-carbon hover:text-brand-600">
                    {o.seller.name}
                  </Link>
                  {o.seller.reviews > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
                      {o.seller.rating.toFixed(1)}
                      <span className="font-normal text-ink-400">({o.seller.reviews})</span>
                    </span>
                  )}
                  {o.seller.salesLabel && (
                    <span className="text-[11px] font-semibold text-ink-400">{o.seller.salesLabel}</span>
                  )}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-ink-400">
                  {(o.seller.city || o.seller.region) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" strokeWidth={2} />
                      {o.seller.city ?? o.seller.region}
                    </span>
                  )}
                  {o.seller.near && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Cerca mío
                    </span>
                  )}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-300">
                  {o.language && (
                    <span className="rounded bg-ink-850 px-1.5 py-0.5 font-semibold">
                      {LANGUAGE_LABEL[o.language] ?? o.language}
                    </span>
                  )}
                  {o.condition && <span className="rounded bg-ink-850 px-1.5 py-0.5 font-semibold">{o.condition}</span>}
                  {o.isFoil && (
                    <span className="rounded bg-gradient-to-r from-gold-300 to-gold-500 px-1.5 py-0.5 font-bold text-[#2a1d00]">Foil</span>
                  )}
                  {o.seller.offersShipping && (
                    <span className="inline-flex items-center gap-1 text-ink-400">
                      <Truck className="h-3 w-3" strokeWidth={2} /> Envío
                    </span>
                  )}
                  {o.seller.offersPickup && (
                    <span className="inline-flex items-center gap-1 text-ink-400">
                      <Store className="h-3 w-3" strokeWidth={2} /> Retiro
                    </span>
                  )}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-4">
                <div className="text-right">
                  {o.price < o.listPrice && (
                    <p className="text-[11px] text-ink-500 line-through">{clp(o.listPrice)}</p>
                  )}
                  <p className="font-display text-lg font-bold text-carbon">{clp(o.price)}</p>
                  <p className="text-[11px] text-ink-400">
                    {o.stock} {o.stock === 1 ? "disponible" : "disponibles"}
                  </p>
                </div>
                <AddButton row={o} base={base} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
