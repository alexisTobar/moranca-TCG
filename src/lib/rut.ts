/** Utilidades para el RUT chileno (registro de comprador, cuenta bancaria). */

function cleanRut(rut: string): string {
  return rut.replace(/[.\s]/g, "").replace("-", "").toUpperCase();
}

function checkDigit(body: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const mod = 11 - (sum % 11);
  if (mod === 11) return "0";
  if (mod === 10) return "K";
  return String(mod);
}

/** Valida formato y dígito verificador (módulo 11) de un RUT chileno. */
export function isValidRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return checkDigit(body) === dv;
}

/** Da formato 12.345.678-9 a un RUT ya validado. */
export function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}
