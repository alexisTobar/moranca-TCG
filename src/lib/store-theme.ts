/** Color de acento por defecto de una tienda (el carmesí de la marca). */
export const DEFAULT_ACCENT = "#c22443";

export const ACCENT_PRESETS = [
  { name: "Carmesí", value: "#c22443" },
  { name: "Azul", value: "#2563eb" },
  { name: "Verde", value: "#059669" },
  { name: "Violeta", value: "#7c3aed" },
  { name: "Naranja", value: "#ea580c" },
  { name: "Rosa", value: "#db2777" },
  { name: "Turquesa", value: "#0891b2" },
  { name: "Grafito", value: "#334155" },
];

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(Math.max(0, Math.min(1, l)) * 100)}%)`;
}

/**
 * Variables CSS que repintan todo el sistema de diseño (botones, enlaces,
 * precios, anillo de foco) con el color de la tienda. Se aplican solo dentro
 * del contenedor de la tienda, así el resto del sitio no cambia.
 * Se oscurece el color si es demasiado claro, para que el texto blanco de los
 * botones siempre se lea.
 */
export function storeThemeVars(accent: string | null | undefined): Record<string, string> {
  const base = isHexColor(accent) ? accent : DEFAULT_ACCENT;
  const [h, s, l0] = hexToHsl(base);
  const l = Math.min(l0, 0.5);
  const c500 = hsl(h, s, l);
  const c400 = hsl(h, s, l + 0.1);
  const c600 = hsl(h, s, l - 0.06);
  const c700 = hsl(h, s, l - 0.14);
  const c800 = hsl(h, s, l - 0.2);
  return {
    "--color-brand-400": c400,
    "--color-brand-500": c500,
    "--color-brand-600": c600,
    "--color-brand-700": c700,
    "--color-accent-300": c500,
    "--color-accent-400": c700,
    "--color-accent-500": c600,
    "--color-accent-600": c800,
    "--ring": `color-mix(in oklab, ${c500} 28%, transparent)`,
  };
}
