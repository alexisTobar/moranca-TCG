import { audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAdmin } from "@/lib/auth";
import { siteSettingsSchema } from "@/lib/validators";
import { getSiteSettings } from "@/lib/site-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ ok: true, settings: await getSiteSettings() });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/settings:GET]", error);
    return NextResponse.json({ error: "No se pudo leer la configuración" }, { status: 500 });
  }
}

/** Solo el administrador decide si hay descuento por pago y de cuánto. */
export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = siteSettingsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const settings = await prisma.siteSetting.upsert({
      where: { id: "site" },
      create: { id: "site", ...parsed.data, updatedById: admin.id },
      update: { ...parsed.data, updatedById: admin.id },
    });

    await audit(admin, "settings.update", { type: "SiteSetting", id: "site", detail: JSON.stringify(parsed.data) });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/settings:PUT]", error);
    return NextResponse.json({ error: "No se pudo guardar la configuración" }, { status: 500 });
  }
}
