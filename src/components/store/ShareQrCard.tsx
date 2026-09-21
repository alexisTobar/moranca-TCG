"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";

export interface QrData {
  size: number;
  rows: string[];
}

const QUIET = 4; // margen claro alrededor del QR, en módulos (lo exige el estándar)
const INK = "#0b0f1a";
/** Fracción del ancho que ocupa el logo del centro. Con corrección nivel H el QR sigue leyéndose. */
const LOGO_RATIO = 0.2;

function modulesPath(qr: QrData): string {
  let d = "";
  for (let r = 0; r < qr.size; r++) {
    const row = qr.rows[r];
    let c = 0;
    while (c < qr.size) {
      if (row[c] === "1") {
        let end = c;
        while (end < qr.size && row[end] === "1") end++;
        d += `M${c + QUIET} ${r + QUIET}h${end - c}v1h${-(end - c)}z`;
        c = end;
      } else c++;
    }
  }
  return d;
}

function download(name: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function toDataUrl(src: string): Promise<string> {
  const blob = await (await fetch(src)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Link para compartir + código QR descargable. Si hay logo, va al centro sobre
 * un fondo blanco (el QR se genera con corrección de errores alta para eso).
 */
export function ShareQrCard({
  url,
  displayUrl,
  qr,
  logoUrl,
  filename,
  title = "Comparte tu perfil",
  hint,
}: {
  url: string;
  /** Texto que se muestra del link (por ejemplo sin el https://). */
  displayUrl?: string;
  qr: QrData;
  logoUrl?: string | null;
  filename: string;
  title?: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const path = useMemo(() => modulesPath(qr), [qr]);
  const total = qr.size + QUIET * 2;
  const logoSize = total * LOGO_RATIO;
  const logoPos = (total - logoSize) / 2;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* si el navegador bloquea el portapapeles, el link se puede seleccionar a mano */
    }
  }

  async function svgString(): Promise<string> {
    let logo = "";
    if (logoUrl) {
      try {
        const data = await toDataUrl(logoUrl);
        logo = `<rect x="${logoPos - 0.6}" y="${logoPos - 0.6}" width="${logoSize + 1.2}" height="${logoSize + 1.2}" rx="2" fill="#fff"/><image href="${data}" x="${logoPos}" y="${logoPos}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
      } catch {
        /* sin logo si no se pudo leer */
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="1024" height="1024"><rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="${INK}"/>${logo}</svg>`;
  }

  async function downloadSvg() {
    setBusy(true);
    try {
      const svg = await svgString();
      download(`${filename}.svg`, URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })));
    } finally {
      setBusy(false);
    }
  }

  async function downloadPng() {
    setBusy(true);
    try {
      const svg = await svgString();
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("No se pudo generar la imagen"));
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      });
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 1024, 1024);
      canvas.toBlob((blob) => blob && download(`${filename}.png`, URL.createObjectURL(blob)), "image/png");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl card-surface p-5">
      <h3 className="text-sm font-semibold text-carbon">{title}</h3>
      {hint && <p className="mt-0.5 text-[12px] text-ink-400">{hint}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div className="relative shrink-0 rounded-2xl border border-ink-800 bg-white p-2 shadow-sm">
          <svg
            viewBox={`0 0 ${total} ${total}`}
            className="h-40 w-40"
            role="img"
            aria-label="Código QR"
            shapeRendering="crispEdges"
          >
            <rect width={total} height={total} fill="#fff" />
            <path d={path} fill={INK} />
            {logoUrl && (
              <>
                <rect
                  x={logoPos - 0.6}
                  y={logoPos - 0.6}
                  width={logoSize + 1.2}
                  height={logoSize + 1.2}
                  rx={2}
                  fill="#fff"
                />
                <image
                  href={logoUrl}
                  x={logoPos}
                  y={logoPos}
                  width={logoSize}
                  height={logoSize}
                  preserveAspectRatio="xMidYMid meet"
                />
              </>
            )}
          </svg>
        </div>

        <div className="min-w-0 flex-1 basis-56">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Tu link</p>
          <p className="mt-1 break-all rounded-xl bg-ink-900 px-3 py-2.5 text-[13px] font-semibold text-carbon select-all">
            {displayUrl ?? url}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="btn btn-primary btn-sm">
              {copied ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
              {copied ? "Copiado" : "Copiar link"}
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <ExternalLink className="h-4 w-4" strokeWidth={2} />
              Abrir
            </a>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={downloadPng} className="btn btn-secondary btn-sm">
              <Download className="h-4 w-4" strokeWidth={2} />
              QR en PNG
            </button>
            <button type="button" disabled={busy} onClick={downloadSvg} className="btn btn-secondary btn-sm">
              <Download className="h-4 w-4" strokeWidth={2} />
              QR en SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
