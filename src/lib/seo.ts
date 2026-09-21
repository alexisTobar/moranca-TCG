/** Dirección pública del sitio, sin barra final. Se usa en sitemap, datos estructurados y canonicals. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export const SITE_NAME = "Win Condition TCG";
