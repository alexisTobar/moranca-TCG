import "server-only";
import crypto from "node:crypto";

/**
 * Login con Google (OAuth 2.0 código de autorización + PKCE). Se activa solo cuando existen
 * GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET; mientras no estén, el botón no aparece.
 *
 * En Google Cloud Console → Credenciales → ID de cliente OAuth (aplicación web), agrega como
 * "URI de redireccionamiento autorizado": https://TU-DOMINIO/api/auth/google/callback
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export const OAUTH_COOKIE = "wc_oauth";

export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/** Solo para pruebas locales: permite apuntar el intercambio de código a un servidor falso. Nunca en producción. */
function tokenUrl(): string {
  if (process.env.NODE_ENV !== "production" && process.env.GOOGLE_TOKEN_URL) return process.env.GOOGLE_TOKEN_URL;
  return "https://oauth2.googleapis.com/token";
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function newPkce() {
  const verifier = b64url(crypto.randomBytes(32));
  return { verifier, challenge: b64url(crypto.createHash("sha256").update(verifier).digest()) };
}

export const redirectUri = (origin: string) => `${origin}/api/auth/google/callback`;

export function authorizationUrl(origin: string, state: string, challenge: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

/**
 * Intercambia el código por los datos de la persona. El id_token llega directo desde Google por HTTPS
 * (no pasa por el navegador), así que basta validar sus campos; igualmente se revisa emisor, audiencia,
 * vencimiento y que el email esté verificado por Google.
 */
export async function exchangeCode(code: string, verifier: string, origin: string): Promise<GoogleProfile> {
  const res = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google respondió ${res.status}`);
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("Google no entregó id_token");

  const part = data.id_token.split(".")[1];
  if (!part) throw new Error("id_token inválido");
  const claims = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;

  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const audOk = claims.aud === process.env.GOOGLE_CLIENT_ID;
  const notExpired = typeof claims.exp === "number" && claims.exp * 1000 > Date.now();
  const emailVerified = claims.email_verified === true || claims.email_verified === "true";
  if (!issuerOk || !audOk || !notExpired) throw new Error("id_token no válido");
  if (!emailVerified) throw new Error("EMAIL_NOT_VERIFIED");
  if (typeof claims.sub !== "string" || typeof claims.email !== "string") throw new Error("id_token incompleto");

  const email = claims.email.toLowerCase().trim();
  const name = typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 80) : email.split("@")[0];
  return { sub: claims.sub, email, name };
}
