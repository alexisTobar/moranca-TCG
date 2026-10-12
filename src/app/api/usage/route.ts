import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { USAGE_PAGES, utcDay } from "@/lib/usage-policy";
import { clientKey, memoryRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const schema = z.object({ id: z.string().uuid(), session: z.string().uuid(), page: z.enum(USAGE_PAGES) });
export async function POST(req: Request) {
  if ((await cookies()).get("wc_analytics")?.value !== "yes" || req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1") return new NextResponse(null, { status: 204 });
  if (!memoryRateLimit(clientKey(req, "usage"), 60, 60).allowed) return new NextResponse(null, { status: 429 });
  if (!process.env.AUTH_SECRET) return new NextResponse(null, { status: 503 });
  if (Number(req.headers.get("content-length") || 0) > 1024) return new NextResponse(null, { status: 413 });
  let body: unknown;
  try { const raw = await req.text(); if (raw.length > 1024) return new NextResponse(null, { status: 413 }); body = JSON.parse(raw); }
  catch { return new NextResponse(null, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const day = utcDay();
  const visitor = createHmac("sha256", process.env.AUTH_SECRET).update(`${day.toISOString()}:${parsed.data.session}`).digest("hex");
  try {
    await prisma.usageEvent.createMany({ data: [{ id: parsed.data.id, day, visitor, page: parsed.data.page }], skipDuplicates: true });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
