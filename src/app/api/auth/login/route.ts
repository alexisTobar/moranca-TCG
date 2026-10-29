import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { completeLogin } from "@/lib/login";
import { rateLimit, clearRateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(200),
  remember: z.boolean().default(false),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email o contraseña inválidos" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const key = clientKey(req, `login:${email}`);

  let limit;
  try {
    // Además del límite por cuenta, un tope por IP frena el rociado de claves sobre muchos correos.
    const byIp = await rateLimit(clientKey(req, "login-ip"), 40, 900);
    if (!byIp.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos desde tu red. Reintenta más tarde." },
        { status: 429, headers: { "Retry-After": String(byIp.retryAfterSeconds) } }
      );
    }
    limit = await rateLimit(key, 6, 900);
  } catch (error) {
    console.error("[login] base de datos", error);
    return NextResponse.json(
      {
        error:
          'No hay conexión con la base de datos. Revisa DATABASE_URL y ejecuta "npm run setup".',
      },
      { status: 503 }
    );
  }

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Demasiados intentos. Reintenta en ${Math.ceil(
          limit.retryAfterSeconds / 60
        )} minuto(s).`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (error) {
    console.error('[login] base de datos', error);
    return NextResponse.json(
      {
        error:
          'No hay conexión con la base de datos. Revisa DATABASE_URL y ejecuta "npm run setup".',
      },
      { status: 503 }
    );
  }

  // Comparación constante incluso si el usuario no existe, para no filtrar cuentas.
  // Hash bcrypt válido (costo 12) de una clave aleatoria: un formato inválido respondería más rápido y delataría cuentas.
  const fakeHash = "$2a$12$cCiVeY/AE6kwcJTwhS9BIunkgVHOho1DioCvL4/Y5/LgdoPF7bJw2";
  const ok = await verifyPassword(parsed.data.password, user?.password ?? fakeHash);

  if (!user || !ok || !user.active) {
    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 }
    );
  }

  await clearRateLimit(key);
  const { needs2fa } = await completeLogin(user, parsed.data.remember);

  return NextResponse.json({
    ok: true,
    needs2fa,
    ...(needs2fa ? {} : { user: { id: user.id, name: user.name, role: user.role } }),
  });
}
