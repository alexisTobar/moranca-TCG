import "server-only";
import qrcode from "qrcode-generator";

export interface QrMatrix {
  size: number;
  /** Una cadena por fila: "1" = módulo oscuro, "0" = claro. */
  rows: string[];
}

/**
 * Genera un código QR. Con `withLogo` usa corrección de errores nivel H (recupera
 * hasta ~30% del código), que es lo que permite poner un logo al centro sin que
 * deje de leerse. Sin logo alcanza con nivel M, que da un QR más simple y fácil
 * de escanear de lejos.
 */
export function buildQr(text: string, withLogo = false): QrMatrix {
  const qr = qrcode(0, withLogo ? "H" : "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  const rows: string[] = [];
  for (let r = 0; r < size; r++) {
    let row = "";
    for (let c = 0; c < size; c++) row += qr.isDark(r, c) ? "1" : "0";
    rows.push(row);
  }
  return { size, rows };
}
