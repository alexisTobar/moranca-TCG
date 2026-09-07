"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CONDITIONS, LANGUAGES } from "@/lib/games";
import { clp } from "@/lib/format";
import type { BulkPreviewItem } from "@/app/api/cards/bulk-preview/route";

export interface SellerOption {
  id: string;
  name: string;
}

interface Row extends BulkPreviewItem {
  included: boolean;
}

const EXAMPLE = `1 Absolute Virtue (FIN) 212
2 Achilles Davenport (ACR) 294
1 Aesi, Tyrant of Gyre Strait (CMR) 365 *F*`;

export function BulkImportForm({
  sellers,
  isAdmin,
  currentUserId,
}: {
  sellers: SellerOption[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [unrecognized, setUnrecognized] = useState<string[]>([]);
  const [totals, setTotals] = useState<{
    lines: number;
    matched: number;
    noPrice: number;
    notFound: number;
  } | null>(null);
  const [usdClp, setUsdClp] = useState<number | null>(null);

  const [condition, setCondition] = useState("NM");
  const [language, setLanguage] = useState("EN");
  const [status, setStatus] = useState<"ACTIVE" | "DRAFT" | "PAUSED">("ACTIVE");
  const [sellerId, setSellerId] = useState(currentUserId);

  const [analyzing, setAnalyzing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  async function onFile(file: File) {
    const content = await file.text();
    setText(content);
  }

  async function analyze() {
    if (!text.trim()) return setError("Pega o sube el archivo .txt primero.");
    setError(null);
    setDone(null);
    setAnalyzing(true);
    try {
      const res = await fetch("/api/cards/bulk-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "magic", text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo analizar el archivo");

      setRows(
        (data.items as BulkPreviewItem[]).map((i) => ({ ...i, included: i.matched }))
      );
      setUnrecognized(data.unrecognized ?? []);
      setTotals(data.totals ?? null);
      setUsdClp(data.usdClp ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev ? prev.map((r, i) => (i === index ? { ...r, ...patch } : r)) : prev
    );
  }

  const included = (rows ?? []).filter((r) => r.included);
  const readyToPublish =
    included.length > 0 && included.every((r) => r.priceClp && r.priceClp > 0);

  async function publish() {
    if (!rows) return;
    setError(null);
    setPublishing(true);
    try {
      const res = await fetch("/api/listings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "magic",
          status,
          condition,
          language,
          sellerId: isAdmin ? sellerId : undefined,
          items: included.map((r) => ({
            title: r.title,
            imageUrl: r.imageUrl,
            price: Math.round(r.priceClp!),
            stock: r.quantity,
            isFoil: r.isFoil,
            setName: r.setName,
            cardNumber: r.cardNumber,
            rarity: r.rarity,
            externalId: r.externalId,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo publicar");

      setDone(data.created);
      setTimeout(() => {
        router.push("/panel/publicaciones");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError((err as Error).message);
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl card-surface p-5">
        <h3 className="text-sm font-semibold text-carbon">
          Pega o sube tu lista de colección
        </h3>
        <p className="mt-0.5 text-[12px] text-ink-400">
          Una carta por línea, formato Moxfield/Archidekt:{" "}
          <code className="rounded bg-ink-900 px-1 py-0.5 text-[11px]">
            cantidad Nombre (SET) número [*F* si es foil]
          </code>
          . El precio se calcula solo desde la referencia de TCGplayer vía
          Scryfall — lo puedes ajustar fila por fila antes de publicar.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={EXAMPLE}
          className="mt-3 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 font-mono text-[12px] text-ink-200 outline-none focus:border-accent-500/70"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <input
            ref={fileRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-ink-700 px-3.5 py-2 text-[12px] font-semibold text-ink-200 transition hover:border-accent-500/70"
          >
            Subir archivo .txt
          </button>
          <button
            type="button"
            disabled={analyzing || !text.trim()}
            onClick={analyze}
            className="rounded-lg bg-brand-600 px-4 py-2 text-[12px] font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
          >
            {analyzing ? "Analizando…" : "Analizar"}
          </button>
          {rows && (
            <button
              type="button"
              onClick={() => {
                setRows(null);
                setTotals(null);
                setUnrecognized([]);
                setDone(null);
              }}
              className="text-[12px] font-semibold text-ink-400 hover:text-ink-200"
            >
              Empezar de nuevo
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-600/40 bg-rose-500/10 p-3 text-[12px] text-brand-600">
          {error}
        </p>
      )}

      {done != null && (
        <p className="rounded-lg border border-emerald-600/40 bg-emerald-500/10 p-3 text-[12px] font-semibold text-emerald-600">
          {done} publicaciones creadas. Redirigiendo…
        </p>
      )}

      {rows && totals && (
        <>
          <div className="rounded-2xl card-surface p-5">
            <div className="flex flex-wrap gap-4 text-[12px] text-ink-300">
              <span>
                <strong className="text-ink-200">{totals.lines}</strong> líneas leídas
              </span>
              <span>
                <strong className="text-emerald-500">{totals.matched}</strong>{" "}
                encontradas en Scryfall
              </span>
              {totals.noPrice > 0 && (
                <span>
                  <strong className="text-amber-500">{totals.noPrice}</strong> sin
                  precio de referencia
                </span>
              )}
              {totals.notFound > 0 && (
                <span>
                  <strong className="text-rose-500">{totals.notFound}</strong> no
                  encontradas
                </span>
              )}
              {usdClp && <span className="text-ink-400">Dólar ${usdClp.toLocaleString("es-CL")}</span>}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Condición
                </span>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 outline-none focus:border-accent-500/70"
                >
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
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 outline-none focus:border-accent-500/70"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Visibilidad
                </span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 outline-none focus:border-accent-500/70"
                >
                  <option value="ACTIVE">Publicada</option>
                  <option value="DRAFT">Borrador</option>
                  <option value="PAUSED">Pausada</option>
                </select>
              </label>
              {isAdmin && (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    Vendedor
                  </span>
                  <select
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 outline-none focus:border-accent-500/70"
                  >
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>

          <div className="rounded-2xl card-surface p-5">
            <h3 className="mb-3 text-sm font-semibold text-carbon">
              {included.length} de {rows.length} filas se van a publicar
            </h3>

            <div className="max-h-[560px] overflow-y-auto rounded-lg border border-ink-800">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-ink-900 text-[10px] uppercase tracking-wider text-ink-400">
                  <tr>
                    <th className="w-8 px-2 py-2"></th>
                    <th className="w-10 px-2 py-2"></th>
                    <th className="px-2 py-2">Carta</th>
                    <th className="w-20 px-2 py-2">Stock</th>
                    <th className="w-32 px-2 py-2">Precio CLP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={`${r.raw}-${i}`}
                      className={`border-t border-ink-800 ${!r.matched ? "opacity-60" : ""}`}
                    >
                      <td className="px-2 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={r.included}
                          disabled={!r.matched}
                          onChange={(e) =>
                            updateRow(i, { included: e.target.checked })
                          }
                          className="h-4 w-4 accent-[#9d2f38]"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        {r.imageUrl ? (
                          <Image
                            src={r.imageUrl}
                            alt=""
                            width={32}
                            height={45}
                            className="rounded object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="block h-[45px] w-8 rounded bg-ink-900" />
                        )}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <p className="font-semibold text-ink-200">
                          {r.title}
                          {r.isFoil && (
                            <span className="ml-1.5 rounded bg-accent-500/20 px-1.5 py-0.5 text-[9px] font-bold text-accent-300">
                              FOIL
                            </span>
                          )}
                        </p>
                        {r.error && (
                          <p className="mt-0.5 text-[11px] text-rose-500">{r.error}</p>
                        )}
                      </td>
                      <td className="px-2 py-2 align-top text-ink-300">{r.quantity}</td>
                      <td className="px-2 py-2 align-top">
                        <input
                          type="number"
                          min={1}
                          value={r.priceClp ?? ""}
                          disabled={!r.matched}
                          onChange={(e) =>
                            updateRow(i, { priceClp: Number(e.target.value) })
                          }
                          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2 py-1.5 text-[12px] text-ink-200 outline-none focus:border-accent-500/70"
                        />
                        {r.priceClp != null && r.priceClp > 0 && (
                          <span className="mt-0.5 block text-[10px] text-ink-400">
                            {clp(r.priceClp)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {unrecognized.length > 0 && (
              <details className="mt-3 text-[12px] text-ink-400">
                <summary className="cursor-pointer font-semibold text-ink-300">
                  {unrecognized.length} líneas no reconocidas (formato distinto)
                </summary>
                <ul className="mt-2 space-y-0.5 font-mono text-[11px]">
                  {unrecognized.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </details>
            )}

            <button
              type="button"
              disabled={!readyToPublish || publishing}
              onClick={publish}
              className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
            >
              {publishing
                ? "Publicando…"
                : `Publicar ${included.length} cartas`}
            </button>
            {!readyToPublish && included.length > 0 && (
              <p className="mt-2 text-center text-[11px] text-amber-500">
                Hay filas incluidas sin precio — complétalas o desmárcalas para
                poder publicar.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
