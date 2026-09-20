import { REGIONS } from "@/lib/regions";

/** Cookie donde el visitante guarda su región para ver "cerca mío". */
export const REGION_COOKIE = "wc_region";

function norm(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Región a la que pertenece una comuna (o null si no calza con ninguna). */
export function regionOfComuna(city: string | null | undefined): string | null {
  if (!city) return null;
  const target = norm(city);
  for (const region of REGIONS) {
    if (region.comunas.some((c) => norm(c) === target)) return region.name;
  }
  return null;
}

/** Región del vendedor: la que eligió, o la que corresponde a su comuna. */
export function sellerRegion(seller: {
  region: string | null;
  city: string | null;
}): string | null {
  if (seller.region && REGIONS.some((r) => r.name === seller.region)) return seller.region;
  return regionOfComuna(seller.city);
}

export function isValidRegion(name: string | null | undefined): name is string {
  return Boolean(name && REGIONS.some((r) => r.name === name));
}
