// Batería de pruebas de punta a punta. Ver tests/README.md para prepararla y ejecutarla.
import pg from "pg";
import fs from "node:fs";
import crypto from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const LOG = process.env.DEV_LOG ?? "./dev.log";
const db = new pg.Client({ connectionString: process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/wctcg" });
await db.connect();
let passed = 0, failed = 0;
const check = (n, c, x = "") => (c ? (passed++, console.log("  OK   ", n)) : (failed++, console.log("  FALLA", n, x)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Correos "enviados": sin RESEND_API_KEY quedan en el log del servidor, uno por uno. */
const mails = () => [...fs.readFileSync(LOG, "utf8").matchAll(/Correo no enviado a (\S+?)\.\r?\nAsunto: (.*)/g)].map((m) => ({ to: m[1], subject: m[2].trim() }));
/** Espera hasta 8 s a que aparezca el correo (el log se escribe con retraso). */
async function mailed(to, prefix, ref) {
  for (let i = 0; i < 32; i++) {
    if (mails().some((m) => m.to === to && m.subject.startsWith(prefix) && (!ref || m.subject.includes(ref)))) return true;
    await sleep(250);
  }
  return false;
}
/** Confirma que un correo NO se envió (espera un poco para dar margen). */
async function notMailed(to, prefix, ref) {
  await sleep(2500);
  return !mails().some((m) => m.to === to && m.subject.startsWith(prefix) && m.subject.includes(ref));
}
const refOf = async (id) => (await db.query(`SELECT "paymentReference" r FROM "Order" WHERE id=$1`, [id])).rows[0].r;

class C {
  cookie = "";
  async req(path, { method = "GET", json } = {}) {
    const res = await fetch(BASE + path, { method, headers: { cookie: this.cookie, ...(json ? { "content-type": "application/json" } : {}) }, body: json ? JSON.stringify(json) : undefined, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) if (c.startsWith("dreamdeck_session=")) this.cookie = c.split(";")[0];
    const ct = res.headers.get("content-type") ?? "";
    return { status: res.status, data: ct.includes("json") ? await res.json().catch(() => null) : await res.text().catch(() => null) };
  }
  login(email, password = "AdminTest2026!") { return this.req("/api/auth/login", { method: "POST", json: { email, password } }); }
}
await db.query(`DELETE FROM "LoginAttempt"`);
const sipo = new C(), buyer = new C(), anon = new C();
await sipo.login("sel_sipo@t.cl");
const [b] = (await db.query(`SELECT email FROM "User" WHERE email LIKE 'b1-%' ORDER BY "createdAt" DESC LIMIT 1`)).rows;
await buyer.login(b.email, "ClaveSegura2026");
const SELLER = "sel_sipo@t.cl";
await db.query(`UPDATE "User" SET "bankName"='Banco Estado', "bankAccountType"='Cuenta Vista', "bankAccountNumber"='123456789', "bankHolderName"='Sipo', "bankRut"='11.111.111-1' WHERE email=$1`, [SELLER]);
await db.query(`UPDATE "Listing" SET stock=30 WHERE "sellerId"=(SELECT id FROM "User" WHERE email=$1) AND status='ACTIVE'`, [SELLER]);
const [L] = (await db.query(`SELECT id, slug FROM "Listing" WHERE "sellerId"=(SELECT id FROM "User" WHERE email=$1) AND status='ACTIVE' AND "offerPrice" IS NULL LIMIT 1`, [SELLER])).rows;
const cart = (extra = {}) => ({ items: [{ listingId: L.id, quantity: 1 }], shipMethod: "PICKUP", paymentMethod: "TRANSFER", ...extra });
const ship = { shipMethod: "SHIPPING", shipAddress: "Av. Prueba 123", shipCity: "Santiago", shipRegion: "Metropolitana de Santiago" };
const buy = async (extra) => (await buyer.req("/api/checkout", { method: "POST", json: cart(extra) })).data?.orders?.[0]?.orderId;

console.log("\n== Autocompra ==");
let r = await sipo.req("/api/checkout", { method: "POST", json: cart() });
check("un vendedor NO puede comprar su propia publicacion (400)", r.status === 400 && /propias/.test(r.data?.error ?? ""), `${r.status} ${JSON.stringify(r.data)}`);

console.log("\n== Correos de una orden (retiro) ==");
r = await buyer.req("/api/checkout", { method: "POST", json: cart() });
check("compra creada (200)", r.status === 200, `${r.status} ${JSON.stringify(r.data)}`);
const oid = r.data?.orders?.[0]?.orderId, ref = r.data?.orders?.[0]?.reference;
check("correo al VENDEDOR: nueva orden", await mailed(SELLER, "Nueva orden", ref));
check("correo al COMPRADOR: pedido reservado", await mailed(b.email, "Reservamos tu pedido", ref));
const body = fs.readFileSync(LOG, "utf8");
check("el correo trae el codigo de referencia, la marca y el boton", body.includes(ref) && body.includes("WIN CONDITION TCG") && body.includes("Ver la orden"));

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const fd = new FormData(); fd.append("file", new Blob([png], { type: "image/png" }), "c.png");
const res = await fetch(BASE + `/api/orders/${oid}/receipt`, { method: "POST", headers: { cookie: buyer.cookie }, body: fd });
check("comprador sube comprobante (201)", res.status === 201, res.status);
check("correo al VENDEDOR: comprobante recibido", await mailed(SELLER, "Comprobante recibido", ref));

r = await sipo.req(`/api/orders/${oid}/status`, { method: "PATCH", json: { status: "PAID" } });
check("vendedor confirma el pago (200)", r.status === 200, r.status);
check("correo al COMPRADOR: pago confirmado", await mailed(b.email, "Pago confirmado", ref));

r = await sipo.req(`/api/orders/${oid}/status`, { method: "PATCH", json: { status: "SHIPPED" } });
check("retiro: correo 'listo para retiro' al comprador", r.status === 200 && (await mailed(b.email, "Tu pedido va en camino", ref)) && fs.readFileSync(LOG, "utf8").includes("listo para retiro"));

r = await buyer.req(`/api/orders/${oid}/status`, { method: "PATCH", json: { status: "DELIVERED" } });
check("comprador confirma recepcion -> correo al VENDEDOR", r.status === 200 && (await mailed(SELLER, "Entrega confirmada", ref)));

console.log("\n== Codigo de seguimiento (envio a domicilio) ==");
const oid2 = await buy(ship);
check("orden con envio creada", Boolean(oid2));
await sipo.req(`/api/orders/${oid2}/status`, { method: "PATCH", json: { status: "PAID" } });
r = await sipo.req(`/api/orders/${oid2}/status`, { method: "PATCH", json: { status: "SHIPPED", trackingCourier: "Starken", trackingCode: "STK-998877/1" } });
check("marcar enviada con courier y N° de seguimiento (200)", r.status === 200, JSON.stringify(r.data));
const [o] = (await db.query(`SELECT "trackingCourier","trackingCode","shippedAt",status FROM "Order" WHERE id=$1`, [oid2])).rows;
check("queda guardado en la orden", o.trackingCourier === "Starken" && o.trackingCode === "STK-998877/1" && o.shippedAt && o.status === "SHIPPED", JSON.stringify(o));
const ref2 = await refOf(oid2);
check("el correo de envio al comprador incluye courier y numero", (await mailed(b.email, "Tu pedido va en camino", ref2)) && /Starken[\s\S]{0,400}STK-998877\/1|STK-998877\/1[\s\S]{0,400}Starken/.test(fs.readFileSync(LOG, "utf8")) && fs.readFileSync(LOG, "utf8").includes("N° de seguimiento"));
const oid4 = await buy(ship);
await sipo.req(`/api/orders/${oid4}/status`, { method: "PATCH", json: { status: "PAID" } });
r = await sipo.req(`/api/orders/${oid4}/status`, { method: "PATCH", json: { status: "SHIPPED", trackingCode: "<script>alert(1)</script>" } });
check("seguimiento con caracteres peligrosos rechazado (400)", r.status === 400, r.status);
const ord = await buyer.req("/cuenta");
check("el comprador ve el seguimiento en Mi cuenta", ord.data.includes("Seguimiento:") && ord.data.includes("Starken"));
const pan = await sipo.req("/panel/ordenes");
check("el vendedor lo ve en su panel", pan.data.includes("Seguimiento:") && pan.data.includes("Starken"));
check("el panel ofrece marcar envio (con courier y N°)", pan.data.includes("Marcar como enviado"));

console.log("\n== Cancelaciones y vencimiento ==");
const oid5 = await buy();
const ref5 = await refOf(oid5);
r = await buyer.req(`/api/orders/${oid5}/status`, { method: "PATCH", json: { status: "CANCELLED" } });
check("comprador cancela (200)", r.status === 200, r.status);
check("-> correo al VENDEDOR", await mailed(SELLER, "Orden cancelada", ref5));
check("-> y NO se manda al mismo comprador que cancelo", await notMailed(b.email, "Orden cancelada", ref5));
const oid7 = await buy();
const ref7 = await refOf(oid7);
r = await sipo.req(`/api/orders/${oid7}/status`, { method: "PATCH", json: { status: "CANCELLED" } });
check("vendedor cancela -> correo al COMPRADOR", r.status === 200 && (await mailed(b.email, "Orden cancelada", ref7)));
const oid6 = await buy();
const ref6 = await refOf(oid6);
await db.query(`UPDATE "Order" SET "paymentDueAt"=now()-interval '1 day' WHERE id=$1`, [oid6]);
r = await anon.req("/api/cron/expire-orders", { method: "POST" });
check("cron sin secreto: 401", r.status === 401, r.status);
const cronRes = await fetch(BASE + "/api/cron/expire-orders", { headers: { authorization: "Bearer testcron" } });
check("cron vence la orden (200)", cronRes.status === 200, cronRes.status);
check("vencimiento -> correo al comprador", await mailed(b.email, "Se venció el plazo", ref6));
check("vencimiento -> correo al vendedor", await mailed(SELLER, "Orden vencida", ref6));
check("la orden queda CANCELLED", (await db.query(`SELECT status FROM "Order" WHERE id=$1`, [oid6])).rows[0].status === "CANCELLED");

console.log("\n== Cambiar contraseña y sesiones ==");
const stamp = Date.now();
const email = `pw-${stamp}@test.cl`;
const A = new C(), B2 = new C();
r = await new C().req("/api/auth/register", { method: "POST", json: { name: "Prueba Clave", email, password: "ClaveVieja2026", rut: "11.111.111-1", phone: "+56 9 1111 2222", address: "Calle 123", acceptTerms: true } });
check("cuenta de prueba creada", r.status === 201, JSON.stringify(r.data));
await A.login(email, "ClaveVieja2026"); await B2.login(email, "ClaveVieja2026");
check("dos dispositivos con sesion (A y B)", (await A.req("/cuenta")).status === 200 && (await B2.req("/cuenta")).status === 200);
r = await anon.req("/api/account/password", { method: "POST", json: { currentPassword: "x", newPassword: "ClaveNueva2026" } });
check("sin sesion: 401", r.status === 401, r.status);
r = await A.req("/api/account/password", { method: "POST", json: { currentPassword: "Incorrecta123", newPassword: "ClaveNueva2026" } });
check("clave actual incorrecta (400)", r.status === 400 && /actual/.test(r.data?.error ?? ""), JSON.stringify(r.data));
r = await A.req("/api/account/password", { method: "POST", json: { currentPassword: "ClaveVieja2026", newPassword: "corta" } });
check("clave nueva debil (400)", r.status === 400, r.status);
r = await A.req("/api/account/password", { method: "POST", json: { currentPassword: "ClaveVieja2026", newPassword: "ClaveVieja2026" } });
check("clave nueva igual a la actual (400)", r.status === 400, r.status);
r = await A.req("/api/account/password", { method: "POST", json: { currentPassword: "ClaveVieja2026", newPassword: "ClaveNueva2026" } });
check("cambio correcto (200)", r.status === 200, JSON.stringify(r.data));
check("este dispositivo (A) sigue con sesion", (await A.req("/cuenta")).status === 200);
check("el OTRO dispositivo (B) queda cerrado (redirige a ingresar)", (await B2.req("/cuenta")).status === 307);
check("B ya no puede usar la API (401)", (await B2.req("/api/account/sessions", { method: "DELETE" })).status === 401);
check("la clave vieja ya no entra", (await new C().login(email, "ClaveVieja2026")).status === 401);
check("la clave nueva entra", (await new C().login(email, "ClaveNueva2026")).status === 200);
const C1 = new C(), C2 = new C();
await C1.login(email, "ClaveNueva2026"); await C2.login(email, "ClaveNueva2026");
check("cerrar otras sesiones (200)", (await C1.req("/api/account/sessions", { method: "DELETE" })).status === 200);
check("C1 sigue abierta y C2 se cerro", (await C1.req("/cuenta")).status === 200 && (await C2.req("/cuenta")).status === 307);
const D = new C(); await D.login(email, "ClaveNueva2026");
const raw = crypto.randomBytes(32).toString("hex");
const uid = (await db.query(`SELECT id FROM "User" WHERE email=$1`, [email])).rows[0].id;
await db.query(`INSERT INTO "PasswordReset"(id,"userId","tokenHash","expiresAt") VALUES ($1,$2,$3,(now() at time zone 'utc')+interval '1 hour')`, ["pr" + stamp, uid, crypto.createHash("sha256").update(raw).digest("hex")]);
r = await anon.req("/api/auth/reset-password", { method: "POST", json: { token: raw, password: "ClaveRecuperada2026" } });
check("recuperar clave con el link (200)", r.status === 200, JSON.stringify(r.data));
check("la recuperacion cierra las sesiones abiertas (D)", (await D.req("/cuenta")).status === 307);
check("y se entra con la clave recuperada", (await new C().login(email, "ClaveRecuperada2026")).status === 200);
check("el link de recuperacion es de un solo uso (400)", (await anon.req("/api/auth/reset-password", { method: "POST", json: { token: raw, password: "OtraClave2026Ab" } })).status === 400);
const oldStyle = new C(); await oldStyle.login("sel_nico@t.cl");
check("usuarios que no cambiaron nada conservan su sesion", (await oldStyle.req("/panel")).status === 200);
await db.query(`DELETE FROM "User" WHERE email=$1`, [email]);

console.log(`\nRESULTADO: ${passed} OK, ${failed} fallas`);
await db.end();
