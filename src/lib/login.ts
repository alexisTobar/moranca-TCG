import "server-only";
import { cookies } from "next/headers";
import { createSession, signPurposeToken } from "@/lib/auth";

export const PENDING_2FA_COOKIE = "wc_2fa";
const PENDING_SECONDS = 300;

export interface LoginUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SELLER" | "BUYER";
  tokenVersion: number;
  totpEnabledAt: Date | null;
}

/**
 * Cierra el login de una persona ya autenticada (por clave o por Google).
 * Si tiene verificación en dos pasos, en vez de abrir la sesión deja una cookie de corta vida
 * y pide el código; la sesión solo se abre cuando ese código es correcto.
 */
export async function completeLogin(user: LoginUser, remember: boolean): Promise<{ needs2fa: boolean }> {
  if (user.totpEnabledAt) {
    const token = await signPurposeToken("2fa", { sub: user.id, remember }, PENDING_SECONDS);
    const store = await cookies();
    store.set(PENDING_2FA_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PENDING_SECONDS,
    });
    return { needs2fa: true };
  }
  await createSession(
    { sub: user.id, email: user.email, name: user.name, role: user.role, tv: user.tokenVersion },
    remember
  );
  return { needs2fa: false };
}
