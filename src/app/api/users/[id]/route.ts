import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, hashPassword, requireAdmin } from "@/lib/auth";
import { userUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const parsed = userUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    if (id === admin.id && data.active === false) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta" },
        { status: 400 }
      );
    }
    if (id === admin.id && data.role === "SELLER") {
      return NextResponse.json(
        { error: "No puedes quitarte el rol de administrador" },
        { status: 400 }
      );
    }

    // Aprobar una solicitud de vendedor sube el rol pase lo que pase con
    // "role" en el body (evita que un olvido del cliente deje al usuario
    // aprobado pero seguir como comprador).
    const approvingSeller = data.sellerRequestStatus === "APPROVED";

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined
          ? { email: data.email.toLowerCase().trim() }
          : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(approvingSeller ? { role: "SELLER" } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.sellerRequestStatus !== undefined
          ? { sellerRequestStatus: data.sellerRequestStatus }
          : {}),
        ...(data.password ? { password: await hashPassword(data.password) } : {}),
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[users:PATCH]", error);
    return NextResponse.json({ error: "Error al actualizar el perfil" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    if (id === admin.id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 400 }
      );
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[users:DELETE]", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
