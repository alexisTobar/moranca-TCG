"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface DeckImageCard {
  imageUrl: string | null;
  quantity: number;
}

const COLS = 7;
const CARD_W = 252;
const CARD_H = 352; // proporción 63:88 de una carta
const GAP = 14;
const PAD = 24;

/** Carga la imagen por el optimizador de Next (mismo origen, reducida): así el canvas no queda bloqueado por CORS y baja rápido. */
function loadCard(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `/_next/image?url=${encodeURIComponent(src)}&w=384&q=80`;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Descarga el mazo como una sola imagen ordenada: solo las cartas y su cantidad. */
export function DeckImageButton({ cards, filename }: { cards: DeckImageCard[]; filename: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const images: Array<HTMLImageElement | null> = new Array(cards.length).fill(null);
      let next = 0;
      // Hasta 6 descargas a la vez para no saturar la conexión.
      await Promise.all(
        Array.from({ length: 6 }, async () => {
          while (next < cards.length) {
            const i = next++;
            const src = cards[i].imageUrl;
            images[i] = src ? await loadCard(src) : null;
          }
        })
      );

      const cols = Math.min(COLS, cards.length);
      const rows = Math.ceil(cards.length / cols);
      const canvas = document.createElement("canvas");
      canvas.width = PAD * 2 + cols * CARD_W + (cols - 1) * GAP;
      canvas.height = PAD * 2 + rows * CARD_H + (rows - 1) * GAP;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.fillStyle = "#0b0f1c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      cards.forEach((card, i) => {
        const x = PAD + (i % cols) * (CARD_W + GAP);
        const y = PAD + Math.floor(i / cols) * (CARD_H + GAP);
        ctx.save();
        roundRect(ctx, x, y, CARD_W, CARD_H, 14);
        ctx.clip();
        const img = images[i];
        if (img) ctx.drawImage(img, x, y, CARD_W, CARD_H);
        else { ctx.fillStyle = "#1a2033"; ctx.fillRect(x, y, CARD_W, CARD_H); }
        ctx.restore();

        // Cantidad: insignia abajo a la derecha de cada carta.
        const label = `x${card.quantity}`;
        ctx.font = "700 46px system-ui, sans-serif";
        const w = Math.max(76, ctx.measureText(label).width + 28);
        const bx = x + CARD_W - w - 10;
        const by = y + CARD_H - 66;
        ctx.fillStyle = "rgba(8,11,22,0.88)";
        roundRect(ctx, bx, by, w, 56, 28);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#f4c35b";
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, bx + w / 2, by + 30);
      });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("No se pudo generar la imagen. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={download} disabled={busy} className="btn btn-secondary btn-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Download className="h-4 w-4" strokeWidth={2} />}
        {busy ? "Generando…" : "Descargar lista en imagen"}
      </button>
      {error && <p role="alert" className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
