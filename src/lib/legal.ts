/**
 * Datos comunes de las páginas legales. Los datos de la empresa se leen del entorno para no dejar
 * información inventada en el código: si no están configurados, simplemente no se muestran.
 */
export const LEGAL_VERSION = "2026-09";
export const LEGAL_UPDATED = "20 de septiembre de 2026";

export const LEGAL_LINKS = [
  { href: "/terminos-y-condiciones", label: "Términos y condiciones" },
  { href: "/politica-de-privacidad", label: "Política de privacidad" },
  { href: "/devoluciones", label: "Devoluciones y reclamos" },
  { href: "/quienes-somos", label: "Quiénes somos" },
] as const;

/** Correo de contacto público (NEXT_PUBLIC_CONTACT_EMAIL). Sin configurar, no se muestra ninguno. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

/** Identificación del titular del sitio (opcional). */
export const LEGAL_ENTITY = {
  name: process.env.NEXT_PUBLIC_LEGAL_NAME?.trim() || null,
  rut: process.env.NEXT_PUBLIC_LEGAL_RUT?.trim() || null,
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() || null,
};
