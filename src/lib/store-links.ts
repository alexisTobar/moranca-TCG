/**
 * Redes y contacto de una tienda. Se guarda solo el dato mínimo (usuario,
 * número o URL https) y el enlace final se arma acá, así nadie puede meter un
 * `javascript:` ni un enlace raro en la tienda.
 */

const SOCIAL_HANDLE = /^[A-Za-z0-9._-]{1,50}$/;

/** "@mi.tienda", "instagram.com/mi.tienda" o la URL completa → "mi.tienda". */
export function normalizeInstagram(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const clean = raw
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
  return SOCIAL_HANDLE.test(clean) ? clean : null;
}

/** Nombre de la página de Facebook (o su URL) → nombre. */
export function normalizeFacebook(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const clean = raw
    .replace(/^https?:\/\/(www\.|m\.)?facebook\.com\//i, "")
    .replace(/^facebook\.com\//i, "")
    .replace(/^@/, "")
    .split(/[?#]/)[0]
    .replace(/\/$/, "");
  return /^[A-Za-z0-9._/-]{1,80}$/.test(clean) ? clean : null;
}

/** Solo dígitos con código de país (ej. 56912345678). */
export function normalizeWhatsapp(input: string | null | undefined): string | null {
  const digits = (input ?? "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  // Un celular chileno sin código de país (9 dígitos) se completa con 56.
  const full = digits.length === 9 ? `56${digits}` : digits;
  return full.length >= 10 && full.length <= 15 ? full : null;
}

/** Solo URLs http(s). */
export function normalizeWebsite(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProto);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
    return url.toString().slice(0, 200);
  } catch {
    return null;
  }
}

export interface StoreLinkSource {
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  website: string | null;
}

export function storeLinks(store: StoreLinkSource) {
  return {
    instagram: store.instagram ? `https://instagram.com/${store.instagram}` : null,
    facebook: store.facebook ? `https://facebook.com/${store.facebook}` : null,
    whatsapp: store.whatsapp ? `https://wa.me/${store.whatsapp}` : null,
    website: store.website,
  };
}
