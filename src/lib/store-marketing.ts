import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/catalog";
import { DEFAULT_PLANS } from "@/lib/store";

export interface MarketingPlan {
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  maxFeatured: number;
  advancedStats: boolean;
  showcase: boolean;
}

/**
 * Planes que se muestran en las páginas de venta. Solo lectura: si todavía no existen en la base
 * (primer deploy) se muestran los planes por defecto, sin escribir nada desde una página pública.
 */
export async function getMarketingPlans(): Promise<MarketingPlan[]> {
  const rows = await safeQuery(
    () =>
      prisma.storePlan.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { code: true, name: true, description: true, priceMonthly: true, maxFeatured: true, advancedStats: true, showcase: true },
      }),
    [] as MarketingPlan[]
  );
  if (rows.length > 0) return rows;
  return DEFAULT_PLANS.map((p) => ({
    code: p.code,
    name: p.name,
    description: p.description,
    priceMonthly: p.priceMonthly,
    maxFeatured: p.maxFeatured,
    advancedStats: p.advancedStats,
    showcase: p.showcase,
  }));
}

/** Lista de beneficios de un plan, construida con sus límites reales (lo que promete la página es lo que se entrega). */
export function planBenefits(p: MarketingPlan): string[] {
  return [
    "Publicaciones ilimitadas, en tu tienda y en el marketplace",
    "Tienda propia con link corto y QR con tu logo",
    "Banner, logo, color de marca y barra de anuncio",
    `Hasta ${p.maxFeatured} productos destacados arriba de tu catálogo`,
    p.advancedStats ? "Estadísticas completas: visitas, escaneos de QR y ventas" : "Estadísticas de visitas y escaneos de QR",
    "Insignia “Tienda verificada”",
    "Soporte directo con el equipo de Win Condition",
    ...(p.showcase ? ["Vitrina “Tiendas destacadas” en el inicio"] : []),
  ];
}
