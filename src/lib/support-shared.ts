/** Constantes de soporte compartidas entre servidor y componentes de cliente. */

export type TicketRequester = "SELLER" | "BUYER";

export const TICKET_CATEGORIES = [
  { value: "PLAN", label: "Mi plan o pago de membresía", for: ["SELLER"] },
  { value: "TIENDA", label: "Mi tienda (diseño, QR, destacados)", for: ["SELLER"] },
  { value: "ORDEN", label: "Un problema con una orden", for: ["SELLER", "BUYER"] },
  { value: "PAGO", label: "Un pago o transferencia", for: ["BUYER"] },
  { value: "CUENTA", label: "Mi cuenta o mis datos", for: ["SELLER", "BUYER"] },
  { value: "OTRO", label: "Otro tema", for: ["SELLER", "BUYER"] },
] as const satisfies ReadonlyArray<{ value: string; label: string; for: readonly TicketRequester[] }>;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]["value"];

/** Temas que puede elegir cada tipo de usuario al abrir un ticket. */
export function categoriesFor(requester: TicketRequester) {
  return TICKET_CATEGORIES.filter((c) => (c.for as readonly TicketRequester[]).includes(requester));
}

export const TICKET_STATUS_LABEL: Record<string, string> = {
  OPEN: "Esperando respuesta",
  ANSWERED: "Respondido",
  CLOSED: "Cerrado",
};

export const REQUESTER_LABEL: Record<string, string> = { SELLER: "Vendedor", BUYER: "Comprador" };

export function categoryLabel(value: string): string {
  return TICKET_CATEGORIES.find((c) => c.value === value)?.label ?? "Otro tema";
}

/** Máximo de tickets sin cerrar por usuario, para evitar abuso. */
export const MAX_OPEN_TICKETS = 5;
