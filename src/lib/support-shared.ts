/** Constantes de soporte compartidas entre servidor y componentes de cliente. */

export const TICKET_CATEGORIES = [
  { value: "PLAN", label: "Mi plan o pago de membresía" },
  { value: "TIENDA", label: "Mi tienda (diseño, QR, destacados)" },
  { value: "ORDEN", label: "Un problema con una orden" },
  { value: "CUENTA", label: "Mi cuenta o mis datos" },
  { value: "OTRO", label: "Otro tema" },
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]["value"];

export const TICKET_STATUS_LABEL: Record<string, string> = {
  OPEN: "Esperando respuesta",
  ANSWERED: "Respondido",
  CLOSED: "Cerrado",
};

export function categoryLabel(value: string): string {
  return TICKET_CATEGORIES.find((c) => c.value === value)?.label ?? "Otro tema";
}

/** Máximo de tickets sin cerrar por vendedor, para evitar abuso. */
export const MAX_OPEN_TICKETS = 5;
