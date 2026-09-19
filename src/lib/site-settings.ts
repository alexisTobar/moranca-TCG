import "server-only";
import { prisma } from "@/lib/db";

export interface SiteSettings {
  transferDiscountEnabled: boolean;
  transferDiscountPct: number;
  cashDiscountEnabled: boolean;
  cashDiscountPct: number;
  paymentWindowHours: number;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  transferDiscountEnabled: true,
  transferDiscountPct: 2,
  cashDiscountEnabled: false,
  cashDiscountPct: 0,
  paymentWindowHours: 48,
};

/**
 * Lee la configuración global que define el administrador. Si la tabla aún no
 * existe o no hay fila, devuelve los valores por defecto para que el sitio
 * nunca se caiga por esto.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { id: "site" } });
    if (!row) return DEFAULT_SITE_SETTINGS;
    return {
      transferDiscountEnabled: row.transferDiscountEnabled,
      transferDiscountPct: row.transferDiscountPct,
      cashDiscountEnabled: row.cashDiscountEnabled,
      cashDiscountPct: row.cashDiscountPct,
      paymentWindowHours: row.paymentWindowHours,
    };
  } catch (error) {
    console.error("[site-settings] usando valores por defecto", error);
    return DEFAULT_SITE_SETTINGS;
  }
}

/** Porcentaje de descuento efectivo para un método de pago (0 si está desactivado). */
export function discountPctFor(
  settings: SiteSettings,
  method: "TRANSFER" | "CASH"
): number {
  if (method === "TRANSFER") {
    return settings.transferDiscountEnabled ? settings.transferDiscountPct : 0;
  }
  return settings.cashDiscountEnabled ? settings.cashDiscountPct : 0;
}
