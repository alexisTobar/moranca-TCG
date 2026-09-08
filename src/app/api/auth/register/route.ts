import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, uniqueUserSlug } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limiter = await rateLimit(clientKey(req, "register"), 8, 3600);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiados registros seguidos. Intenta más tarde." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      slug: await uniqueUserSlug(data.name),
      password: await hashPassword(data.password),
      role: "BUYER",
      rut: data.rut,
      phone: data.phone,
      address: data.address,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: "BUYER",
  });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
