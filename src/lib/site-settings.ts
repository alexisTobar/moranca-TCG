import "server-only";
import { prisma } from "@/lib/db";

export interface SiteSettings {
  transferDiscountEnabled: boolean;
  transferDiscountPct: number;
  cashDiscountEnabled: boolean;
  cashDiscountPct: number;
  paymentWindowHours: number;
}

/** Sin descuentos por defecto: los crea y activa el administrador. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  transferDiscountEnabled: false,
  transferDiscountPct: 0,
  cashDiscountEnabled: false,
  cashDiscountPct: 0,
  paymentWindowHours: 48,
};

/**
 * Lee la configuración global. El plazo de pago viene de SiteSetting y los
 * descuentos del descuento ACTIVO de cada método (tabla PaymentDiscount). Si
 * las tablas aún no existen devuelve los valores por defecto, para que el
 * sitio nunca se caiga por esto.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const [row, active] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { id: "site" } }),
      prisma.paymentDiscount.findMany({
        where: { active: true },
        orderBy: { updatedAt: "desc" },
        select: { method: true, percent: true },
      }),
    ]);
    const transfer = active.find((d) => d.method === "TRANSFER");
    const cash = active.find((d) => d.method === "CASH");
    return {
      transferDiscountEnabled: Boolean(transfer),
      transferDiscountPct: transfer?.percent ?? 0,
      cashDiscountEnabled: Boolean(cash),
      cashDiscountPct: cash?.percent ?? 0,
      paymentWindowHours: row?.paymentWindowHours ?? DEFAULT_SITE_SETTINGS.paymentWindowHours,
    };
  } catch (error) {
    console.error("[site-settings] usando valores por defecto", error);
    return DEFAULT_SITE_SETTINGS;
  }
}

/** Porcentaje de descuento efectivo para un método de pago (0 si no hay ninguno activo). */
export function discountPctFor(
  settings: SiteSettings,
  method: "TRANSFER" | "CASH"
): number {
  if (method === "TRANSFER") {
    return settings.transferDiscountEnabled ? settings.transferDiscountPct : 0;
  }
  return settings.cashDiscountEnabled ? settings.cashDiscountPct : 0;
}
