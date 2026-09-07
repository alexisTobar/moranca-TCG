import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { fetchMagicSets } from "@/lib/providers/magic";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireUser();
    const sets = await fetchMagicSets();
    return NextResponse.json({ sets });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[cards/magic-sets]", error);
    return NextResponse.json(
      { error: "No se pudo cargar la lista de ediciones." },
      { status: 502 }
    );
  }
}
