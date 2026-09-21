import "server-only";
import crypto from "node:crypto";

/**
 * TOTP (RFC 6238) con HMAC-SHA1, 6 dígitos y ventana de 30 s: compatible con Google Authenticator,
 * Microsoft Authenticator, Authy y 1Password. Implementado con `crypto` de Node, sin dependencias.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error("base32 inválido");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", secret).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

/**
 * Verifica un código de 6 dígitos con tolerancia de ±1 paso (30 s) por diferencias de reloj.
 * Devuelve el paso que coincidió, o null. `lastStep` impide reutilizar un código ya usado.
 */
export function verifyTotp(secretBase32: string, code: string, lastStep?: number | null, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretBase32);
  const step = currentStep(now);
  for (const s of [step - 1, step, step + 1]) {
    if (lastStep != null && s <= lastStep) continue;
    const expected = Buffer.from(hotp(secret, s));
    const given = Buffer.from(code);
    if (expected.length === given.length && crypto.timingSafeEqual(expected, given)) return s;
  }
  return null;
}

export function otpauthUrl(email: string, secret: string): string {
  const issuer = "Win Condition TCG";
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/* ---- El secreto se guarda cifrado (AES-256-GCM) con una clave derivada de AUTH_SECRET ---- */

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET no está definido o es muy corto");
  return crypto.createHash("sha256").update(`${secret}:totp`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}

export function decryptSecret(blob: string): string {
  const raw = Buffer.from(blob, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

/* ---- Códigos de respaldo (un solo uso) ---- */

export function generateRecoveryCodes(n = 8): string[] {
  return Array.from({ length: n }, () => {
    const hex = crypto.randomBytes(4).toString("hex");
    return `${hex.slice(0, 4)}-${hex.slice(4)}`;
  });
}

export const hashRecoveryCode = (code: string) =>
  crypto.createHash("sha256").update(code.trim().toLowerCase().replace(/\s/g, "")).digest("hex");
