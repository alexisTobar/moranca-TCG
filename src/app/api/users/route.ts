import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, hashPassword, requireAdmin, uniqueUserSlug } from "@/lib/auth";
import { userSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const parsed = userSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const email = data.email.toLowerCase().trim();

    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        slug: await uniqueUserSlug(data.name),
        password: await hashPassword(data.password),
        role: data.role,
        city: data.city ?? null,
        phone: data.phone ?? null,
        bio: data.bio ?? null,
        active: data.active,
      },
      select: { id: true, name: true, slug: true, email: true, role: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[users:POST]", error);
    return NextResponse.json({ error: "Error al crear el perfil" }, { status: 500 });
  }
}
