import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/format";

export const SESSION_COOKIE = "dreamdeck_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas
const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días con "Recordarme"

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: "ADMIN" | "SELLER" | "BUYER";
  /** Versión de sesión del usuario (User.tokenVersion). Tokens antiguos sin este dato equivalen a 0. */
  tv?: number;
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET no está definido o es muy corto (mínimo 32 caracteres)."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

const PURPOSE_AUDIENCE = "dreamdeck-purpose";

/** Token firmado de corta vida para un paso intermedio (por ejemplo, esperar el código 2FA). No sirve como sesión. */
export async function signPurposeToken(purpose: string, claims: Record<string, unknown>, ttlSeconds: number) {
  return new SignJWT({ ...claims, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("dreamdeck-tcg")
    .setAudience(PURPOSE_AUDIENCE)
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey());
}

export async function verifyPurposeToken(purpose: string, token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: "dreamdeck-tcg", audience: PURPOSE_AUDIENCE });
    return payload.purpose === purpose ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload, remember = false) {
  const maxAge = remember ? REMEMBER_MAX_AGE_SECONDS : MAX_AGE_SECONDS;
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("dreamdeck-tcg")
    .setAudience("dreamdeck-tcg")
    .setExpirationTime(`${maxAge}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "dreamdeck-tcg",
      audience: "dreamdeck-tcg",
    });
    if (!payload.sub || !payload.role) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role:
        payload.role === "ADMIN" ? "ADMIN" : payload.role === "BUYER" ? "BUYER" : "SELLER",
      tv: typeof payload.tv === "number" ? payload.tv : 0,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Sesión validada contra la base de datos (usuario existe y está activo). */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      slug: true,
      role: true,
      active: true,
      avatarUrl: true,
      tokenVersion: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
  if (!user || !user.active) return null;
  // Si se cambió la clave o se cerraron las sesiones, los tokens anteriores dejan de valer.
  if ((session.tv ?? 0) !== user.tokenVersion) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("No autenticado", 401);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("Requiere rol administrador", 403);
  return user;
}

/** Genera un slug único de perfil, agregando -2, -3… si ya existe. */
export async function uniqueUserSlug(base: string): Promise<string> {
  const root = slugify(base) || "cuenta";
  let candidate = root;
  for (let i = 2; i < 200; i++) {
    const exists = await prisma.user.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}
