import { NextResponse } from "next/server";
import { expireOverdueOrders } from "@/lib/order-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Cancela las órdenes con el plazo de pago vencido y devuelve su stock. */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const expired = await expireOverdueOrders();
  return NextResponse.json({ ok: true, expired });
}

export async function POST(req: Request) {
  return GET(req);
}
