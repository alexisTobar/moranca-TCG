import { NextResponse } from "next/server";

/** Link corto del perfil de un vendedor (más corto = QR más fácil de escanear). */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(`/vendedor/${encodeURIComponent(slug)}`, req.url);
  return NextResponse.redirect(url, 307);
}
