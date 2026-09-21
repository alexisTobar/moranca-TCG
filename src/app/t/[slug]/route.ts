import { NextResponse } from "next/server";

/** Link corto de una tienda. Conserva ?src=qr para contar los escaneos. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const from = new URL(req.url);
  const url = new URL(`/tienda/${encodeURIComponent(slug)}`, req.url);
  const src = from.searchParams.get("src");
  if (src) url.searchParams.set("src", src);
  return NextResponse.redirect(url, 307);
}
