import "server-only";
import { prisma } from "@/lib/db";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Límite por ventana deslizante, persistido en la base de datos para que
 * funcione también en entornos serverless (Vercel) con múltiples instancias.
 */
export async function rateLimit(
  key: string,
  limit = 5,
  windowSeconds = 300
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowSeconds * 1000);

  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - windowSeconds * 4000) } },
  });

  const count = await prisma.loginAttempt.count({
    where: { key, createdAt: { gte: since } },
  });

  if (count >= limit) {
    const oldest = await prisma.loginAttempt.findFirst({
      where: { key, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const retry = oldest
      ? Math.max(
          1,
          Math.ceil(
            (oldest.createdAt.getTime() + windowSeconds * 1000 - Date.now()) / 1000
          )
        )
      : windowSeconds;
    return { allowed: false, remaining: 0, retryAfterSeconds: retry };
  }

  await prisma.loginAttempt.create({ data: { key } });
  return { allowed: true, remaining: limit - count - 1, retryAfterSeconds: 0 };
}

export async function clearRateLimit(key: string) {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}

export function clientKey(req: Request, suffix = ""): string {
  const h = req.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return `${ip}:${suffix}`;
}

/**
 * Límite en memoria del proceso, sin tocar la base de datos.
 *
 * Para endpoints donde el límite es solo anti-abuso y no de seguridad (por
 * ejemplo, el buscador de cartas). Evita 3 viajes a Supabase por búsqueda, que
 * en la práctica agregaban varios segundos a cada tecla escrita.
 *
 * El login sigue usando `rateLimit`, que persiste en la base de datos, porque
 * ahí sí importa que el límite sobreviva entre instancias serverless.
 */
const memoryHits = new Map<string, number[]>();

export function memoryRateLimit(
  key: string,
  limit = 60,
  windowSeconds = 60
): RateLimitResult {
  const now = Date.now();
  const since = now - windowSeconds * 1000;

  const hits = (memoryHits.get(key) ?? []).filter((t) => t > since);

  if (hits.length >= limit) {
    memoryHits.set(key, hits);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((hits[0] + windowSeconds * 1000 - now) / 1000)
      ),
    };
  }

  hits.push(now);
  memoryHits.set(key, hits);

  // Limpieza ocasional para que el mapa no crezca sin control.
  if (memoryHits.size > 5000) {
    for (const [k, v] of memoryHits) {
      if (v.every((t) => t <= since)) memoryHits.delete(k);
    }
  }

  return { allowed: true, remaining: limit - hits.length, retryAfterSeconds: 0 };
}
