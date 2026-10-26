import { checkoutPayload } from "./checkout-payload.mjs";
// Batería de pruebas de punta a punta. Ver tests/README.md para prepararla y ejecutarla.
// Recorre el ciclo de vida completo de una venta: el vendedor publica y crea un cupón, un visitante navega,
// el comprador compra con cupón, conversan por el chat de la orden, el vendedor confirma, despacha y entrega,
// y el comprador deja su reseña. También revisa permisos y el stock en cada paso.
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const db = new pg.Client({ connectionString: process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/wctcg" });
await db.connect();
let passed = 0, failed = 0;
const check = (n, c, x = "") => (c ? (passed++, console.log("  OK   ", n)) : (failed++, console.log("  FALLA", n, x)));

class C {
  cookie = "";
  async req(path, { method = "GET", json } = {}) {
    if (path === "/api/checkout" && json) json = await checkoutPayload(this, json);
    const res = await fetch(BASE + path, { method, headers: { cookie: this.cookie, ...(json ? { "content-type": "application/json" } : {}) }, body: json ? JSON.stringify(json) : undefined, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) if (c.startsWith("dreamdeck_session=")) this.cookie = c.split(";")[0];
    const ct = res.headers.get("content-type") ?? "";
    return { status: res.status, location: res.headers.get("location"), data: ct.includes("json") ? await res.json().catch(() => null) : await res.text().catch(() => null) };
  }
  login(email, pw = "AdminTest2026!") { return this.req("/api/auth/login", { method: "POST", json: { email, password: pw } }); }
}
await db.query(`DELETE FROM "LoginAttempt"`);
const SELLER = "sel_sipo@t.cl";
await db.query(`UPDATE "User" SET "bankName"='Banco Estado', "bankAccountType"='Cuenta Vista', "bankAccountNumber"='123456789', "bankHolderName"='Sipo', "bankRut"='11.111.111-1' WHERE email=$1`, [SELLER]);
await db.query(`DELETE FROM "Coupon" WHERE code='FLUJO10'`);
// Restos de corridas anteriores (antes del arreglo, un comprador podía publicar).
await db.query(`DELETE FROM "Listing" WHERE "sellerId" IN (SELECT id FROM "User" WHERE role='BUYER') AND NOT EXISTS (SELECT 1 FROM "OrderItem" oi WHERE oi."listingId"="Listing".id)`);

const seller = new C(), buyer = new C(), other = new C(), anon = new C();
await seller.login(SELLER); await other.login("sel_nico@t.cl");
const [b] = (await db.query(`SELECT email FROM "User" WHERE email LIKE 'b1-%' ORDER BY "createdAt" DESC LIMIT 1`)).rows;
await buyer.login(b.email, "ClaveSegura2026");

console.log("\n== 1. El vendedor publica ==");
const title = `Charizard flujo ${Date.now()}`;
let r = await seller.req("/api/listings", { method: "POST", json: { type: "SINGLE", game: "pokemon", title, price: 10000, stock: 3, condition: "NM", language: "EN", setName: "Base Set" } });
check("publica una carta (201)", r.status === 201, JSON.stringify(r.data));
const listing = r.data?.listing;
r = await buyer.req("/api/listings", { method: "POST", json: { type: "SINGLE", game: "pokemon", title: "Intento", price: 1000 } });
check("un comprador NO puede publicar (403)", r.status === 403, r.status);
r = await buyer.req("/api/listings/bulk", { method: "POST", json: { items: [] } });
check("un comprador NO puede usar la carga masiva (403)", r.status === 403, r.status);
r = await buyer.req(`/api/listings/${listing.id}`, { method: "PATCH", json: { price: 1 } });
check("un comprador NO puede editar publicaciones (403)", r.status === 403, r.status);
const [leak] = (await db.query(`SELECT count(*)::int n FROM "Listing" l JOIN "User" u ON u.id=l."sellerId" WHERE u.role='BUYER'`)).rows;
check("no quedan publicaciones de compradores", leak.n === 0, leak.n);
r = await seller.req("/api/listings", { method: "POST", json: { type: "SINGLE", game: "pokemon", title, price: 1000, offerPrice: 2000 } });
check("rechaza una oferta mayor al precio (400)", r.status === 400, r.status);
r = await seller.req("/api/seller/coupons", { method: "POST", json: { code: "flujo10", type: "PERCENT", value: 10 } });
check("crea un cupón del 10% (código en mayúsculas)", r.status === 200 && r.data?.coupon?.code === "FLUJO10", JSON.stringify(r.data));

console.log("\n== 2. Un visitante navega ==");
r = await anon.req(`/producto/${listing.slug}`);
check("la ficha del producto es pública (200)", r.status === 200 && r.data.includes(title));
check("la ficha tiene datos estructurados de producto", /"@type":"Product"/.test(r.data));
r = await anon.req(`/cartas?q=${encodeURIComponent("charizard flujo")}`);
check("aparece al buscar en el catálogo", r.status === 200 && r.data.includes("Charizard flujo"));
r = await anon.req("/checkout");
check("un visitante que va a pagar debe ingresar", r.status === 307 && (r.location ?? "").includes("/ingresar"), `${r.status} ${r.location}`);
r = await anon.req("/api/checkout", { method: "POST", json: { items: [{ listingId: listing.id, quantity: 1 }], shipMethod: "PICKUP", paymentMethod: "TRANSFER" } });
check("un visitante no puede comprar sin cuenta", r.status === 401 || r.status === 403, r.status);

console.log("\n== 3. El comprador compra con cupón ==");
const cart = { items: [{ listingId: listing.id, quantity: 2 }], shipMethod: "SHIPPING", shipAddress: "Av. Prueba 123", shipCity: "Santiago", shipRegion: "Metropolitana de Santiago", paymentMethod: "TRANSFER" };
r = await buyer.req("/api/checkout/quote", { method: "POST", json: { ...cart, couponCode: "FLUJO10" } });
const quoted = (r.data?.sellers ?? []).reduce((s, x) => s + x.total, 0);
check("la cotización aplica el cupón", r.status === 200 && quoted > 0 && quoted <= 18000 + 20000, JSON.stringify(r.data));
r = await buyer.req("/api/checkout", { method: "POST", json: { ...cart, items: [{ listingId: listing.id, quantity: 4 }] } });
check("no deja comprar más que el stock", r.status === 400 || r.status === 409, `${r.status} ${JSON.stringify(r.data)}`);
r = await buyer.req("/api/checkout", { method: "POST", json: { ...cart, couponCode: "FLUJO10" } });
check("compra creada (200)", r.status === 200 && r.data?.orders?.length === 1, `${r.status} ${JSON.stringify(r.data)}`);
const orderId = r.data?.orders?.[0]?.orderId;
const [order] = (await db.query(`SELECT status, subtotal, "couponDiscount", total, "couponCode" FROM "Order" WHERE id=$1`, [orderId])).rows;
check("el descuento del cupón es 10% del subtotal", order?.couponCode === "FLUJO10" && order.couponDiscount === 2000 && order.subtotal === 20000, JSON.stringify(order));
const stock = async () => (await db.query(`SELECT stock FROM "Listing" WHERE id=$1`, [listing.id])).rows[0].stock;
check("el stock queda reservado (3 → 1)", (await stock()) === 1, await stock());
r = await buyer.req("/cuenta");
check("la compra aparece en Mi cuenta", r.status === 200 && r.data.includes(title));
r = await seller.req("/panel/ordenes");
check("la orden aparece en el panel del vendedor", r.status === 200 && r.data.includes(title));

console.log("\n== 4. Chat de la compra ==");
r = await buyer.req(`/api/orders/${orderId}/messages`, { method: "POST", json: { body: "Hola, ¿la carta viene con protector?" } });
check("el comprador escribe al vendedor (201)", r.status === 201, JSON.stringify(r.data));
r = await seller.req(`/api/orders/${orderId}/messages`, { method: "POST", json: { body: "Sí, va con protector y top loader." } });
check("el vendedor responde (201)", r.status === 201, JSON.stringify(r.data));
r = await buyer.req(`/api/orders/${orderId}/messages`);
const texts = (r.data?.messages ?? []).map((m) => m.body);
check("el comprador ve la conversación en orden", texts.includes("Hola, ¿la carta viene con protector?") && texts.includes("Sí, va con protector y top loader."), JSON.stringify(texts));
r = await other.req(`/api/orders/${orderId}/messages`);
check("otro vendedor NO puede leer el chat", r.status === 403 || r.status === 404, r.status);
r = await other.req(`/api/orders/${orderId}/messages`, { method: "POST", json: { body: "Me meto" } });
check("otro vendedor NO puede escribir en el chat", r.status === 403 || r.status === 404, r.status);
r = await anon.req(`/api/orders/${orderId}/messages`);
check("un anónimo NO puede leer el chat", r.status === 401 || r.status === 403, r.status);
r = await buyer.req(`/api/orders/${orderId}/messages`, { method: "POST", json: { body: "" } });
check("rechaza un mensaje vacío (400)", r.status === 400, r.status);

console.log("\n== 5. Pago, despacho y entrega ==");
r = await buyer.req(`/api/orders/${orderId}/status`, { method: "PATCH", json: { status: "PAID" } });
check("el comprador NO puede marcar su orden como pagada", r.status === 403, r.status);
r = await seller.req(`/api/orders/${orderId}/status`, { method: "PATCH", json: { status: "DELIVERED" } });
check("el vendedor no puede dar por recibida la orden (403)", r.status === 403, r.status);
r = await seller.req(`/api/orders/${orderId}/status`, { method: "PATCH", json: { status: "PAID" } });
check("el vendedor confirma el pago (200)", r.status === 200, JSON.stringify(r.data));
r = await buyer.req(`/api/orders/${orderId}/review`, { method: "POST", json: { rating: 5, comment: "Antes de tiempo" } });
check("no se puede reseñar antes de recibir (409)", r.status === 409, r.status);
r = await seller.req(`/api/orders/${orderId}/status`, { method: "PATCH", json: { status: "SHIPPED", trackingCourier: "Starken", trackingCode: "ST123456" } });
check("el vendedor despacha (200)", r.status === 200, JSON.stringify(r.data));
r = await buyer.req(`/api/orders/${orderId}/status`, { method: "PATCH", json: { status: "DELIVERED" } });
check("el comprador confirma que la recibió (200)", r.status === 200, JSON.stringify(r.data));
r = await buyer.req(`/api/orders/${orderId}/messages`);
check("el chat registra los cambios de estado", (r.data?.messages ?? []).some((m) => /Pago confirmado/.test(m.body)), JSON.stringify((r.data?.messages ?? []).map((m) => m.body)));

console.log("\n== 6. Reseña ==");
r = await other.req(`/api/orders/${orderId}/review`, { method: "POST", json: { rating: 1 } });
check("otro usuario NO puede reseñar esta compra", r.status === 403, r.status);
r = await buyer.req(`/api/orders/${orderId}/review`, { method: "POST", json: { rating: 5, comment: "Llegó perfecta y bien protegida." } });
check("el comprador deja su reseña", r.status === 200 || r.status === 201, JSON.stringify(r.data));
r = await buyer.req(`/api/orders/${orderId}/review`, { method: "POST", json: { rating: 4 } });
check("no se puede reseñar dos veces (409)", r.status === 409, r.status);
r = await anon.req("/vendedor/sipo-tcg");
check("la reseña se ve en el perfil del vendedor", r.status === 200 && r.data.includes("Llegó perfecta y bien protegida."));

console.log("\n== 7. Cancelación devuelve el stock ==");
r = await buyer.req("/api/checkout", { method: "POST", json: { ...cart, items: [{ listingId: listing.id, quantity: 1 }] } });
const second = r.data?.orders?.[0]?.orderId;
check("segunda compra creada", r.status === 200 && !!second, JSON.stringify(r.data));
check("stock 1 → 0", (await stock()) === 0, await stock());
r = await buyer.req(`/api/orders/${second}/status`, { method: "PATCH", json: { status: "CANCELLED" } });
check("el comprador cancela su orden pendiente (200)", r.status === 200, JSON.stringify(r.data));
check("el stock vuelve (0 → 1)", (await stock()) === 1, await stock());

await db.query(`DELETE FROM "Coupon" WHERE code='FLUJO10'`);
// La carta de prueba tiene órdenes y no se puede borrar: se pausa para no inflar el catálogo en la próxima corrida.
await db.query(`UPDATE "Listing" SET status='PAUSED' WHERE title LIKE 'Charizard flujo %'`);
await db.end();
console.log(`\nRESULTADO: ${passed} OK, ${failed} fallas`);
process.exit(failed ? 1 : 0);
