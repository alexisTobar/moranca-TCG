import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

// Ejecuta los handlers reales con adaptadores controlados: no toca una base real.
const require = createRequire(import.meta.url);
const root = process.cwd();
function load(file, mocks = {}, cache = new Map()) {
  const full = path.resolve(root, file);
  if (cache.has(full)) return cache.get(full).exports;
  const module = { exports: {} }; cache.set(full, module);
  const source = ts.transpileModule(fs.readFileSync(full, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === "server-only") return {};
    if (name.startsWith("@/") || name.startsWith(".")) {
      const target = name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : path.resolve(path.dirname(full), name);
      return load(target.endsWith(".ts") ? target : `${target}.ts`, mocks, cache);
    }
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: full })(localRequire, module, module.exports);
  return module.exports;
}
class AuthError extends Error { constructor(message, status = 401) { super(message); this.status = status; } }
const key = "f53c53d2-5b51-47ea-b209-fc3f93286581";
const valid = { items: [{ listingId: "card", quantity: 1 }], shipMethod: "PICKUP", paymentMethod: "TRANSFER", idempotencyKey: key, acceptTerms: true, expectedTotal: 1000 };
function fixture() {
  const state = { records: new Map(), orders: [], stock: 3, user: { id: "buyer", name: "Comprador", email: "test@example.test" },
    seller: { id: "seller", name: "Vendedor", active: true, role: "SELLER", offersPickup: true, offersShipping: true, bankName: "Banco", bankAccountType: "Vista", bankAccountNumber: "123", bankHolderName: "Vendedor", bankRut: "123" } };
  const db = {
    consentRecord: { create: async ({ data }) => { assert.equal(data.userId, state.user.id); assert.equal(data.accepted, true); return data; } },
    checkoutRequest: {
      findUnique: async ({ where }) => state.records.get(where.key) ?? null,
      create: async ({ data }) => { state.records.set(data.key, data); return data; },
      update: async ({ where, data }) => { Object.assign(state.records.get(where.key), data); },
    },
    listing: {
      findMany: async () => [{ id: "card", title: "Carta", price: 1000, offerPrice: null, stock: state.stock, status: "ACTIVE", sellerId: "seller" }],
      updateMany: async ({ where, data }) => { assert.equal(where.status, "ACTIVE"); assert.equal(where.seller.active, true); assert.equal(where.price, 1000); if (state.stock < where.stock.gte) return { count: 0 }; state.stock -= data.stock.decrement; return { count: 1 }; },
    },
    user: { findMany: async () => [state.seller] },
    coupon: { findMany: async () => [] },
    order: { findFirst: async () => null, create: async ({ data }) => { const order = { id: `order-${state.orders.length}`, ...data }; state.orders.push(order); return order; } },
    $transaction: async (fn) => {
      const snapshot = { records: structuredClone(state.records), orders: structuredClone(state.orders), stock: state.stock };
      try { return await fn(db); } catch (error) { Object.assign(state, snapshot); throw error; }
    },
  };
  const mocks = {
    "@/lib/db": { prisma: db },
    "@/lib/auth": { AuthError, requireUser: async () => { if (!state.user) throw new AuthError("No autenticado"); return state.user; } },
    "@/lib/verification": { emailNotVerifiedResponse: () => null },
    "@/lib/rate-limit": { rateLimit: async () => ({ allowed: true }), clientKey: () => "test" },
    "@/lib/order-mail": { mailOrderCreated: async () => {} },
    "@/lib/site-settings": { getSiteSettings: async () => ({ paymentWindowHours: 48 }), discountPctFor: () => 0 },
    "@/lib/order-payments": { expireOverdueOrders: async () => {}, generatePaymentReference: () => "DD-TEST", paymentDueDate: () => new Date("2026-10-15"), recordOrderEvent: async () => {} },
  };
  const route = load("src/app/api/checkout/route.ts", mocks);
  return { state, post: (data = valid) => route.POST(new Request("http://localhost/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) })) };
}
test("checkout rechaza sesión ausente", async () => { const f = fixture(); f.state.user = null; assert.equal((await f.post()).status, 401); assert.equal(f.state.orders.length, 0); });
test("checkout exige aceptación y no acepta productos duplicados", async () => { const f = fixture(); assert.equal((await f.post({ ...valid, acceptTerms: false })).status, 400); assert.equal((await f.post({ ...valid, items: [valid.items[0], valid.items[0]] })).status, 400); assert.equal(f.state.stock, 3); });
test("transferencia sin banco completo no reserva stock", async () => { const f = fixture(); f.state.seller.bankRut = " "; assert.equal((await f.post()).status, 409); assert.equal(f.state.orders.length, 0); assert.equal(f.state.stock, 3); });
test("vendedor desactivado no puede recibir compras", async () => { const f = fixture(); f.state.seller.active = false; assert.equal((await f.post()).status, 409); assert.equal(f.state.stock, 3); });
test("reintento idéntico devuelve la misma orden y descuenta stock una vez", async () => { const f = fixture(); const first = await f.post(); assert.equal(first.status, 200); const response = await first.json(); const retry = await f.post(); assert.deepEqual(await retry.json(), response); assert.equal(f.state.orders.length, 1); assert.equal(f.state.stock, 2); assert.equal(f.state.orders[0].termsVersion, "2026-10-17"); });
test("una clave no se puede reutilizar con otro carrito ni comprador", async () => { const f = fixture(); await f.post(); assert.equal((await f.post({ ...valid, notes: "otra compra" })).status, 409); f.state.user = { ...f.state.user, id: "other" }; assert.equal((await f.post()).status, 409); assert.equal(f.state.orders.length, 1); });
test("cambio de total exige nueva confirmación y revierte reserva", async () => { const f = fixture(); assert.equal((await f.post({ ...valid, expectedTotal: 900 })).status, 409); assert.equal(f.state.stock, 3); assert.equal(f.state.orders.length, 0); assert.equal(f.state.records.size, 0); });
test("efectivo no exige banco pero sí retiro", async () => { const f = fixture(); f.state.seller.bankRut = null; assert.equal((await f.post({ ...valid, paymentMethod: "CASH" })).status, 200); const g = fixture(); assert.equal((await g.post({ ...valid, paymentMethod: "CASH", shipMethod: "SHIPPING" })).status, 400); });
test("cron no cancela comprobantes en revisión, incluso si aparecen durante la ejecución", async () => {
  let released = 0;
  const db = { order: {
    findMany: async ({ where }) => { assert.equal(where.receiptUploadId, null); return [{ id: "one", stockReserved: true, items: [{ listingId: "card", quantity: 1 }] }]; },
    updateMany: async ({ where }) => { assert.equal(where.receiptUploadId, null); assert.equal(where.status, "PENDING"); assert.ok(where.paymentDueAt.lt instanceof Date); return { count: 0 }; },
  }, listing: { update: async () => { released++; } }, $transaction: async (fn) => fn(db) };
  const lib = load("src/lib/order-payments.ts", { "@/lib/db": { prisma: db }, "@/lib/order-mail": { mailOrdersExpired: async () => {} } });
  assert.equal(await lib.expireOverdueOrders(), 0); assert.equal(released, 0);
});
test("descarga de analítica rechaza comprador y vendedor antes de consultar datos", async () => {
  for (const status of [401, 403]) {
    let read = false;
    const route = load("src/app/api/admin/analytics/route.ts", { "@/lib/auth": { AuthError, requireAdmin: async () => { throw new AuthError("Denegado", status); } }, "@/lib/usage": { usageSummary: async () => { read = true; } }, "@/lib/db": { prisma: {} } });
    assert.equal((await route.GET(new Request("http://localhost/api/admin/analytics"))).status, status); assert.equal(read, false);
  }
});
test("analítica no registra sin consentimiento", async () => {
  let writes = 0;
  const route = load("src/app/api/usage/route.ts", { "next/headers": { cookies: async () => ({ get: () => undefined }) }, "@/lib/db": { prisma: { usageEvent: { createMany: async () => { writes++; } } } } });
  assert.equal((await route.POST(new Request("http://localhost/api/usage", { method: "POST" }))).status, 204); assert.equal(writes, 0);
});
test("cancelación pagada exige referencia de devolución y deja auditoría", async () => {
  const events = [];
  let writes = 0;
  const db = { order: {
    findUnique: async () => ({ id: "order", status: "PAID", buyerId: "buyer", sellerId: "seller", stockReserved: true, items: [] }),
    updateMany: async () => { writes++; return { count: 1 }; },
  }, orderMessage: { create: async () => {} }, $transaction: async (fn) => fn(db) };
  const route = load("src/app/api/orders/[id]/status/route.ts", {
    "@/lib/db": { prisma: db }, "@/lib/auth": { AuthError, requireUser: async () => ({ id: "seller", role: "SELLER" }) },
    "@/lib/order-payments": { releaseOrderStock: async () => {}, recordOrderEvent: async (...args) => events.push(args[3]) },
    "@/lib/order-mail": { mailOrderStatus: async () => {} },
  });
  const patch = (body) => route.PATCH(new Request("http://localhost/api/orders/order/status", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "order" }) });
  assert.equal((await patch({ status: "CANCELLED" })).status, 400); assert.equal(writes, 0);
  assert.equal((await patch({ status: "CANCELLED", refundReference: "BANK-REF-12345" })).status, 200); assert.ok(events.includes("REFUND_RECORDED"));
});
test("semana cerrada y categorías no exponen identificadores de las rutas", () => {
  const { previousWeek, usagePage } = load("src/lib/usage-policy.ts");
  assert.deepEqual(previousWeek(new Date("2026-10-12T10:00:00Z")), { start: new Date("2026-10-05"), end: new Date("2026-10-12") });
  assert.equal(usagePage("/producto/private-id"), "producto"); assert.equal(usagePage("/panel/analitica"), null); assert.equal(usagePage("/recuperar/secret-token"), null);
});

function consentFixture({ user = null, fail = false, allowed = true } = {}) {
  const records = [];
  const route = load("src/app/api/consent/route.ts", {
    "next/headers": { cookies: async () => ({ get: () => undefined }) },
    "@/lib/auth": { getCurrentUser: async () => user },
    "@/lib/rate-limit": { clientKey: () => "test", memoryRateLimit: () => ({ allowed }) },
    "@/lib/db": { prisma: { consentRecord: { create: async ({ data }) => { if (fail) throw new Error("offline"); records.push(data); return data; } } } },
  });
  const post = (body = { accepted: true, version: "2026-10-17" }, headers = {}) => route.POST(new Request("http://localhost/api/consent", { method: "POST", headers, body: JSON.stringify(body) }));
  return { post, records };
}
test("consentimiento guarda decisión y versión antes de habilitar cookies", async () => {
  const f = consentFixture({ user: { id: "buyer" } });
  const response = await f.post();
  assert.equal(response.status, 200);
  assert.equal(f.records.length, 1);
  assert.equal(f.records[0].userId, "buyer");
  assert.equal(f.records[0].version, "2026-10-17");
  assert.ok(f.records[0].statement.includes("retirar"));
  assert.match(response.headers.get("set-cookie"), /wc_analytics=yes/);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
});
test("rechazo anónimo también deja respaldo sin inventar usuario", async () => {
  const f = consentFixture();
  const response = await f.post({ accepted: false, version: "2026-10-17" });
  assert.equal(response.status, 200); assert.equal(f.records[0].accepted, false);
  assert.equal(f.records[0].userId, undefined); assert.match(f.records[0].subject, /^[a-f0-9-]{36}$/);
  assert.match(response.headers.get("set-cookie"), /wc_analytics=no/);
});
test("consentimiento rechaza versión antigua y propiedades inyectadas", async () => {
  const f = consentFixture();
  for (const body of [{ accepted: true, version: "old" }, { accepted: true, version: "2026-10-17", userId: "admin" }, { accepted: "true", version: "2026-10-17" }]) assert.equal((await f.post(body)).status, 400);
  assert.equal(f.records.length, 0);
});
test("fallo de persistencia no entrega una cookie de aceptación", async () => {
  const f = consentFixture({ fail: true }); const response = await f.post();
  assert.equal(response.status, 503); assert.equal(response.headers.get("set-cookie"), null);
});
test("señales DNT y GPC prevalecen sobre estadísticas opcionales", async () => {
  for (const header of ["dnt", "sec-gpc"]) {
    const f = consentFixture(); const response = await f.post(undefined, { [header]: "1" });
    assert.equal((await response.json()).accepted, false); assert.equal(f.records[0].accepted, false);
  }
});
test("limitación de frecuencia evita escribir decisiones abusivas", async () => {
  const f = consentFixture({ allowed: false }); assert.equal((await f.post()).status, 429); assert.equal(f.records.length, 0);
});
test("respaldo de consentimientos exige administrador antes de leer", async () => {
  for (const status of [401, 403]) {
    let reads = 0;
    const route = load("src/app/api/admin/consents/route.ts", { "@/lib/auth": { AuthError, requireAdmin: async () => { throw new AuthError("Denegado", status); } }, "@/lib/db": { prisma: { consentRecord: { findMany: async () => { reads++; return []; } } } } });
    assert.equal((await route.GET(new Request("http://localhost/api/admin/consents"))).status, status); assert.equal(reads, 0);
  }
});
test("analítica no acepta una cookie de consentimiento de versión anterior", async () => {
  let writes = 0;
  const route = load("src/app/api/usage/route.ts", { "next/headers": { cookies: async () => ({ get: (key) => ({ value: key === "wc_analytics" ? "yes" : "old" }) }) }, "@/lib/db": { prisma: { usageEvent: { createMany: async () => { writes++; } } } } });
  assert.equal((await route.POST(new Request("http://localhost/api/usage", { method: "POST" }))).status, 204); assert.equal(writes, 0);
});
