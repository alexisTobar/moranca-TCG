import "server-only";
import crypto from "node:crypto";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const DEFAULT_PLANS = [
  {
    code: "TIENDA",
    name: "Tienda",
    description: "Tu tienda propia con banner, logo, colores, link y QR.",
    priceMonthly: 4990,
    maxFeatured: 6,
    advancedStats: false,
    showcase: false,
    sortOrder: 1,
  },
  {
    code: "PRO",
    name: "Tienda Pro",
    description: "Todo lo de Tienda, más estadísticas completas y vitrina de tiendas destacadas.",
    priceMonthly: 9990,
    maxFeatured: 12,
    advancedStats: true,
    showcase: true,
    sortOrder: 2,
  },
] as const;

/** Crea los dos planes iniciales si todavía no existe ninguno. El administrador los edita después. */
export async function ensureDefaultPlans() {
  const count = await prisma.storePlan.count();
  if (count > 0) return;
  for (const p of DEFAULT_PLANS) {
    await prisma.storePlan.upsert({ where: { code: p.code }, create: { ...p }, update: {} });
  }
}

export interface StoreState {
  status: string;
  activeUntil: Date | null;
  planId: string | null;
}

/** Una tienda está activa con un plan vigente y sin suspensión del administrador. */
export function isStoreActive(store: StoreState | null | undefined, now = new Date()): boolean {
  return Boolean(
    store &&
      store.status === "ACTIVE" &&
      store.planId &&
      store.activeUntil &&
      store.activeUntil.getTime() > now.getTime()
  );
}

/** Condición de Prisma equivalente a `isStoreActive`, para filtrar en consultas. */
export function activeStoreWhere(now = new Date()): Prisma.StoreWhereInput {
  return { status: "ACTIVE", planId: { not: null }, activeUntil: { gt: now } };
}

/** Fecha "sin vencimiento" de las cuentas de administrador. */
export const ADMIN_PLAN_UNTIL = new Date("2099-12-31T00:00:00Z");

/**
 * El administrador siempre tiene todo lo del plan Pro, sin comprarlo ni renovarlo.
 * Es idempotente y barato: si ya está en orden no escribe nada. Sin `sellerId`, cubre a todos los administradores.
 */
export async function ensureAdminPro(sellerId?: string) {
  try {
    await ensureDefaultPlans();
    const pro = await prisma.storePlan.findUnique({ where: { code: "PRO" }, select: { id: true } });
    if (!pro) return;
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", active: true, ...(sellerId ? { id: sellerId } : {}) },
      select: { id: true, store: { select: { planId: true, status: true, activeUntil: true } } },
    });
    for (const a of admins) {
      const s = a.store;
      const ok =
        s && s.planId === pro.id && s.status === "ACTIVE" && s.activeUntil && s.activeUntil.getFullYear() >= 2098;
      if (ok) continue;
      await prisma.store.upsert({
        where: { sellerId: a.id },
        create: { sellerId: a.id, planId: pro.id, status: "ACTIVE", activeUntil: ADMIN_PLAN_UNTIL },
        update: { planId: pro.id, status: "ACTIVE", activeUntil: ADMIN_PLAN_UNTIL },
      });
    }
  } catch (error) {
    console.error("[store] no se pudo asegurar el plan Pro del administrador", error);
  }
}

/** Devuelve la tienda del vendedor, creándola vacía la primera vez. */
export async function ensureStore(sellerId: string) {
  return prisma.store.upsert({
    where: { sellerId },
    create: { sellerId },
    update: {},
    include: { plan: true },
  });
}

/** Suma meses de calendario (1 de enero + 1 mes = 1 de febrero). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // 31 de enero + 1 mes no existe: se queda en el último día del mes.
  if (d.getDate() < day) d.setDate(0);
  return d;
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Código que el vendedor pone en el comentario de la transferencia de su membresía. */
export function generateStoreReference(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += REF_ALPHABET[crypto.randomInt(REF_ALPHABET.length)];
  return `TI-${code}`;
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Suma una visita al día de hoy (y un escaneo de QR si corresponde). Nunca rompe la página. */
export async function recordStoreVisit(storeId: string, fromQr: boolean) {
  try {
    const day = todayUtc();
    await prisma.storeVisitDay.upsert({
      where: { storeId_day: { storeId, day } },
      create: { storeId, day, views: 1, qrScans: fromQr ? 1 : 0 },
      update: { views: { increment: 1 }, ...(fromQr ? { qrScans: { increment: 1 } } : {}) },
    });
  } catch (error) {
    console.error("[store] no se pudo registrar la visita", error);
  }
}

/**
 * Dirección pública del sitio, tomada de la petición. Así los links y los QR
 * siempre apuntan al dominio real (Vercel, dominio propio o localhost).
 */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Datos bancarios del administrador: es a quien se le transfiere la membresía. */
export async function getMembershipBank() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", active: true, bankAccountNumber: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      bankName: true,
      bankAccountType: true,
      bankAccountNumber: true,
      bankHolderName: true,
      bankRut: true,
    },
  });
  if (!admin?.bankAccountNumber) return null;
  return {
    bankName: admin.bankName,
    accountType: admin.bankAccountType,
    accountNumber: admin.bankAccountNumber,
    holderName: admin.bankHolderName,
    rut: admin.bankRut,
  };
}

export const MEMBERSHIP_MONTHS = [1, 3, 6, 12] as const;

/**
 * Suma `months` meses de plan a una tienda. Si todavía tiene días vigentes, los
 * meses se agregan al final (no se pierde lo ya pagado); si estaba vencida,
 * corren desde hoy. No cambia la suspensión manual del administrador.
 */
export async function applyPlanPeriod(
  tx: Prisma.TransactionClient,
  storeId: string,
  planId: string,
  months: number,
  now = new Date()
): Promise<{ start: Date; end: Date }> {
  const [store, plan] = await Promise.all([
    tx.store.findUniqueOrThrow({ where: { id: storeId }, select: { activeUntil: true, planId: true } }),
    tx.storePlan.findUniqueOrThrow({ where: { id: planId }, select: { showcase: true } }),
  ]);
  const start = store.activeUntil && store.activeUntil.getTime() > now.getTime() ? store.activeUntil : now;
  const end = addMonths(start, months);
  await tx.store.update({
    where: { id: storeId },
    data: {
      planId,
      activeUntil: end,
      // Al pasar a un plan con vitrina la tienda entra sola a "destacadas" (el admin puede apagarla);
      // si el plan nuevo no la incluye, sale de la vitrina.
      ...(!plan.showcase ? { featured: false } : store.planId !== planId ? { featured: true } : {}),
    },
  });
  return { start, end };
}
