import { NextResponse } from "next/server";
import { expireOverdueOrders } from "@/lib/order-payments";
import { snapshotAllPrices } from "@/lib/card-market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Cancela las órdenes con el plazo de pago vencido (devuelve su stock) y guarda la foto diaria de precios. */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const expired = await expireOverdueOrders();
  // Aprovecha el mismo cron diario para guardar la foto de precios de cada carta.
  let snapshots = 0;
  try {
    snapshots = await snapshotAllPrices();
  } catch (error) {
    console.error("[cron] snapshotAllPrices", error);
  }
  return NextResponse.json({ ok: true, expired, snapshots });
}

export async function POST(req: Request) {
  return GET(req);
}
