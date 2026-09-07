"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";
import { CardSearch, type CardResult } from "./CardSearch";
import { ImageUploader } from "./ImageUploader";
import {
  CONDITIONS,
  LANGUAGES,
  LISTING_TYPES,
  type GameId,
} from "@/lib/games";
import { clp } from "@/lib/format";

export interface DeckEntry {
  externalId?: string | null;
  name: string;
  imageUrl?: string | null;
  quantity: number;
  setName?: string | null;
  cardNumber?: string | null;
}

export interface ListingFormValues {
  id?: string;
  type: "SINGLE" | "SEALED" | "DECK";
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "SOLD";
  game: GameId;
  title: string;
  imageUrl: string | null;
  price: number;
  stock: number;
  condition: string | null;
  language: string | null;
  isFoil: boolean;
  description: string | null;
  setName: string | null;
  cardNumber: string | null;
  rarity: string | null;
  externalId: string | null;
  featured: boolean;
  sellerId: string | null;
  deckCards: DeckEntry[];
}

export interface SellerOption {
  id: string;
  name: string;
}

const EMPTY: ListingFormValues = {
  type: "SINGLE",
  status: "ACTIVE",
  game: "magic",
  title: "",
  imageUrl: null,
  price: 0,
  stock: 1,
  condition: "NM",
  language: "ES",
  isFoil: false,
  description: null,
  setName: null,
  cardNumber: null,
  rarity: null,
  externalId: null,
  featured: false,
  sellerId: null,
  deckCards: [],
};

export function ListingForm({
  initial,
  sellers,
  isAdmin,
  currentUserId,
}: {
  initial?: Partial<ListingFormValues>;
  sellers: SellerOption[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ListingFormValues>({
    ...EMPTY,
    ...initial,
    sellerId: initial?.sellerId ?? currentUserId,
  });
  const [reference, setReference] = useState<CardResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial?.id);

  const set = <K extends keyof ListingFormValues>(
    key: K,
    value: ListingFormValues[K]
  ) => setValues((v) => ({ ...v, [key]: value }));

  const totalDeckCards = useMemo(
    () => values.deckCards.reduce((a, c) => a + c.quantity, 0),
    [values.deckCards]
  );

  function pickCard(card: CardResult) {
    if (values.type === "DECK") {
      setValues((v) => {
        const idx = v.deckCards.findIndex((c) => c.externalId === card.externalId);
        if (idx >= 0) {
          const next = [...v.deckCards];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          return { ...v, deckCards: next };
        }
        return {
          ...v,
          imageUrl: v.imageUrl ?? card.imageUrl,
          deckCards: [
            ...v.deckCards,
            {
              externalId: card.externalId,
              name: card.name,
              imageUrl: card.imageUrl,
              quantity: 1,
              setName: card.setName ?? null,
              cardNumber: card.cardNumber ?? null,
            },
          ],
        };
      });
      return;
    }

    // El precio de referencia nunca se escribe solo: queda a la vista bajo el
    // campo Precio y se copia únicamente si haces clic en "usar este precio".
    setReference(card);
    setValues((v) => ({
      ...v,
      title: card.code ? `${card.name} · ${card.code}` : card.name,
      imageUrl: card.imageLarge ?? card.imageUrl,
      setName: card.setName ?? null,
      cardNumber: card.cardNumber ?? null,
      rarity: card.rarity ?? null,
      externalId: card.externalId,
    }));
  }

  function changeQty(index: number, delta: number) {
    setValues((v) => {
      const next = [...v.deckCards];
      const q = next[index].quantity + delta;
      if (q <= 0) next.splice(index, 1);
      else next[index] = { ...next[index], quantity: q };
      return { ...v, deckCards: next };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.title.trim()) return setError("Ponle un título a la publicación.");
    if (values.price < 1) return setError("El precio debe ser mayor a 0.");
    if (values.type === "DECK" && values.deckCards.length === 0) {
      return setError("Agrega al menos una carta al mazo.");
    }

    setSaving(true);
    try {
      const payload = {
        ...values,
        price: Math.round(values.price),
        stock: Math.round(values.stock),
        sellerId: isAdmin ? values.sellerId : undefined,
        deckCards: values.type === "DECK" ? values.deckCards : [],
      };

      const res = await fetch(
        isEdit ? `/api/listings/${initial?.id}` : "/api/listings",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");

      router.push("/panel/publicaciones");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* TIPO */}
      <div className="rounded-2xl card-surface p-5">
        <h3 className="text-sm font-semibold text-carbon">¿Qué vas a vender?</h3>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {LISTING_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("type", t.value as ListingFormValues["type"])}
              className={`rounded-xl border p-4 text-left transition ${
                values.type === t.value
                  ? "border-accent-500/60 bg-accent-500/10"
                  : "border-ink-700 hover:border-ink-600"
              }`}
            >
              <span
                className={`block text-sm font-bold ${
                  values.type === t.value ? "text-accent-300" : "text-ink-200"
                }`}
              >
                {t.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-ink-400">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* BUSCADOR */}
      {values.type !== "SEALED" && (
        <CardSearch
          game={values.game}
          onGameChange={(g) => set("game", g)}
          onPick={pickCard}
          label={
            values.type === "DECK"
              ? "Arma tu mazo carta por carta"
              : "Buscar la carta en el catálogo oficial"
          }
          hint={
            values.type === "DECK"
              ? "Cada carta que elijas se agrega a la lista del mazo. Vuelve a hacer clic para sumar copias."
              : "Escribe el nombre y elige la impresión correcta. La imagen se toma automáticamente."
          }
        />
      )}

      {values.type === "SEALED" && (
        <div className="rounded-2xl card-surface p-5">
          <h3 className="text-sm font-semibold text-carbon">Juego del producto</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["magic", "pokemon", "onepiece", "myl"] as GameId[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => set("game", g)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${
                  values.game === g
                    ? "border-accent-500/60 bg-accent-500/10 text-accent-300"
                    : "border-ink-700 text-ink-400 hover:text-ink-200"
                }`}
              >
                {g === "myl" ? "Mitos y Leyendas" : g === "onepiece" ? "One Piece" : g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* IMAGEN — sirve para los tres tipos: si la carta no está en ninguna API,
          o si prefieres mostrar la foto real de tu producto, la subes aquí. */}
      <ImageUploader
        value={values.imageUrl}
        onChange={(url) => set("imageUrl", url)}
        hint={
          values.type === "SEALED"
            ? "Sube la foto de tu producto sellado."
            : values.type === "DECK"
              ? "Portada del mazo. Si no subes nada, se usa la primera carta."
              : "Se completa sola al elegir una carta del buscador. Si la carta no aparece, sube la foto tú mismo."
        }
      />

      {/* LISTA DEL MAZO */}
      {values.type === "DECK" && (
        <div className="rounded-2xl card-surface p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-carbon">Lista del mazo</h3>
              <p className="mt-0.5 text-[12px] text-ink-400">
                {values.deckCards.length} cartas distintas · {totalDeckCards} copias en
                total
              </p>
            </div>
            {values.deckCards.length > 0 && (
              <button
                type="button"
                onClick={() => set("deckCards", [])}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-600"
              >
                Vaciar mazo
              </button>
            )}
          </div>

          {values.deckCards.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-ink-700 p-8 text-center text-[13px] text-ink-400">
              Usa el buscador de arriba para ir agregando cartas al mazo.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7">
              {values.deckCards.map((card, i) => (
                <div
                  key={`${card.externalId}-${i}`}
                  className="group relative overflow-hidden rounded-lg border border-ink-700 bg-ink-950"
                >
                  <div className="relative aspect-[63/88]">
                    {card.imageUrl && (
                      <Image
                        src={card.imageUrl}
                        alt={card.name}
                        fill
                        sizes="120px"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                    <span className="absolute right-1 top-1 rounded bg-ink-950/90 px-1.5 py-0.5 text-[10px] font-bold text-accent-300">
                      ×{card.quantity}
                    </span>
                  </div>
                  <p className="line-clamp-2 px-1 py-1 text-[9px] leading-tight text-ink-300">
                    {card.name}
                  </p>
                  <div className="flex border-t border-ink-800">
                    <button
                      type="button"
                      onClick={() => changeQty(i, -1)}
                      className="flex-1 py-1 text-[12px] text-ink-400 transition hover:bg-rose-500/20 hover:text-brand-600"
                      aria-label={`Quitar copia de ${card.name}`}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => changeQty(i, 1)}
                      className="flex-1 border-l border-ink-800 py-1 text-[12px] text-ink-400 transition hover:bg-accent-500/20 hover:text-accent-300"
                      aria-label={`Agregar copia de ${card.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DATOS */}
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <div className="rounded-2xl card-surface p-5">
            <h3 className="mb-4 text-sm font-semibold text-carbon">
              Datos de la publicación
            </h3>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Título *
              </span>
              <input
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                required
                maxLength={180}
                placeholder="Ej: Charizard VMAX · Darkness Ablaze"
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-accent-500/70"
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Precio CLP *
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={values.price || ""}
                  onChange={(e) => set("price", Number(e.target.value))}
                  required
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-accent-500/70"
                />
                {values.price > 0 && (
                  <span className="mt-1 block text-[11px] font-semibold text-brand-600">
                    {clp(values.price)}
                  </span>
                )}
              </label>

              {reference && (reference.priceClp || reference.priceClpFoil) && (
                <div className="rounded-lg border border-ink-700 bg-ink-900 p-2.5 sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    Referencia de mercado · TCGplayer
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {reference.priceClp && (
                      <button
                        type="button"
                        onClick={() => set("price", reference.priceClp!)}
                        className="rounded-md border border-ink-700 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-200 transition hover:border-brand-500 hover:text-brand-600"
                      >
                        Normal {clp(reference.priceClp)}
                        <span className="ml-1 font-normal text-ink-400">
                          usar
                        </span>
                      </button>
                    )}
                    {reference.priceClpFoil && (
                      <button
                        type="button"
                        onClick={() => set("price", reference.priceClpFoil!)}
                        className="rounded-md border border-ink-700 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-200 transition hover:border-brand-500 hover:text-brand-600"
                      >
                        Foil {clp(reference.priceClpFoil)}
                        <span className="ml-1 font-normal text-ink-400">
                          usar
                        </span>
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-[10px] text-ink-400">
                    Solo referencia. El precio de venta lo defines tú.
                  </p>
                </div>
              )}

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Stock
                </span>
                <input
                  type="number"
                  min={0}
                  value={values.stock}
                  onChange={(e) => set("stock", Number(e.target.value))}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-accent-500/70"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Estado
                </span>
                <select
                  value={values.condition ?? ""}
                  onChange={(e) => set("condition", e.target.value || null)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-accent-500/70"
                >
                  <option value="">—</option>
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Idioma
                </span>
                <select
                  value={values.language ?? ""}
                  onChange={(e) => set("language", e.target.value || null)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-accent-500/70"
                >
                  <option value="">—</option>
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Edición / Set
                </span>
                <input
                  value={values.setName ?? ""}
                  onChange={(e) => set("setName", e.target.value || null)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-accent-500/70"
                />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={values.isFoil}
                onChange={(e) => set("isFoil", e.target.checked)}
                className="h-4 w-4 accent-[#9d2f38]"
              />
              <span className="text-[13px] text-ink-200">Es foil / holográfica</span>
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Descripción
              </span>
              <textarea
                value={values.description ?? ""}
                onChange={(e) => set("description", e.target.value || null)}
                rows={4}
                maxLength={4000}
                placeholder="Detalles del estado, si viene en sleeve, si acepta cambios…"
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-accent-500/70"
              />
            </label>
          </div>
        </div>

        {/* PREVIEW + PUBLICACIÓN */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-2xl card-surface p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-400">
              Vista previa
            </p>
            <div className="relative aspect-[63/88] overflow-hidden rounded-lg border border-ink-700 bg-ink-950">
              {values.imageUrl ? (
                <Image
                  src={values.imageUrl}
                  alt=""
                  fill
                  sizes="240px"
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-ink-700">
                  <ImageOff className="h-10 w-10" strokeWidth={1.5} />
                </div>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-[12px] font-semibold text-ink-200">
              {values.title || "Sin título"}
            </p>
            <p className="font-display text-lg font-bold text-accent-400">
              {clp(values.price || 0)}
            </p>
          </div>

          <div className="rounded-2xl card-surface p-4">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Visibilidad
              </span>
              <select
                value={values.status}
                onChange={(e) =>
                  set("status", e.target.value as ListingFormValues["status"])
                }
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 outline-none focus:border-accent-500/70"
              >
                <option value="ACTIVE">Publicada</option>
                <option value="DRAFT">Borrador</option>
                <option value="PAUSED">Pausada</option>
                <option value="SOLD">Vendida</option>
              </select>
            </label>

            {isAdmin && (
              <>
                <label className="mt-3 block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    Vendedor
                  </span>
                  <select
                    value={values.sellerId ?? currentUserId}
                    onChange={(e) => set("sellerId", e.target.value)}
                    className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 outline-none focus:border-accent-500/70"
                  >
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-3 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={values.featured}
                    onChange={(e) => set("featured", e.target.checked)}
                    className="h-4 w-4 accent-[#9d2f38]"
                  />
                  <span className="text-[12px] text-ink-200">Destacar en la portada</span>
                </label>
              </>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-rose-600/40 bg-rose-500/10 p-3 text-[12px] text-brand-600">
              {error}
            </p>
          )}

          <button
            disabled={saving}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
          >
            {saving
              ? "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Publicar en Dream Deck"}
          </button>
        </div>
      </div>
    </form>
  );
}
