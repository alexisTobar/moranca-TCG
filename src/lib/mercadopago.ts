import "server-only";

export interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
}

export interface PreferenceResult {
  id: string;
  init_point: string;
}

export function mercadoPagoEnabled(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

/**
 * Crea una preferencia de pago en Mercado Pago.
 * Devuelve null si aún no se ha configurado MP_ACCESS_TOKEN.
 */
export async function createPreference(params: {
  orderId: string;
  items: PreferenceItem[];
  payer: { name: string; email: string };
}): Promise<PreferenceResult | null> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return null;

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.orderId,
    },
    body: JSON.stringify({
      external_reference: params.orderId,
      items: params.items.map((i) => ({
        title: i.title.slice(0, 250),
        quantity: i.quantity,
        unit_price: i.unit_price,
        currency_id: "CLP",
      })),
      payer: { name: params.payer.name, email: params.payer.email },
      back_urls: {
        success: `${site}/compra/exito?order=${params.orderId}`,
        failure: `${site}/compra/error?order=${params.orderId}`,
        pending: `${site}/compra/pendiente?order=${params.orderId}`,
      },
      auto_return: "approved",
      notification_url: `${site}/api/mercadopago/webhook`,
      statement_descriptor: "COMARCATCG",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mercado Pago respondió ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { id: string; init_point: string };
  return { id: json.id, init_point: json.init_point };
}
