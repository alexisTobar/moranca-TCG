import { randomUUID } from "node:crypto";

// Los clientes e2e reproducen la cotización y aceptación explícita del checkout.
export async function checkoutPayload(client, payload) {
  const quote = await client.req("/api/checkout/quote", { method: "POST", json: payload });
  return {
    acceptTerms: true,
    idempotencyKey: randomUUID(),
    expectedTotal: (quote.data?.sellers ?? []).reduce((sum, seller) => sum + seller.total, 0),
    ...payload,
  };
}
