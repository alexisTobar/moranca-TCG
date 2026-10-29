import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quién está conectado, solo lo necesario para pintar el encabezado. Se consulta desde el navegador para que las páginas públicas puedan servirse desde caché. */
export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  return NextResponse.json(
    { role: user ? user.role : null },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
