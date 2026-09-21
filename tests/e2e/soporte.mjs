// Batería de pruebas de punta a punta. Ver tests/README.md para prepararla y ejecutarla.
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const db = new pg.Client({ connectionString: process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/wctcg" });
await db.connect();
let passed = 0, failed = 0;
const check = (n, c, x = "") => (c ? (passed++, console.log("  OK   ", n)) : (failed++, console.log("  FALLA", n, x)));

class C {
  cookie = "";
  async req(path, { method = "GET", json, form } = {}) {
    const res = await fetch(BASE + path, { method, headers: { cookie: this.cookie, ...(json ? { "content-type": "application/json" } : {}) }, body: json ? JSON.stringify(json) : form, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) if (c.startsWith("dreamdeck_session=")) this.cookie = c.split(";")[0];
    const ct = res.headers.get("content-type") ?? "";
    return { status: res.status, data: ct.includes("json") ? await res.json().catch(() => null) : await res.text().catch(() => null) };
  }
  login(email, pw = "AdminTest2026!") { return this.req("/api/auth/login", { method: "POST", json: { email, password: pw } }); }
}
await db.query(`DELETE FROM "LoginAttempt"`);
await db.query(`DELETE FROM "SupportMessage"`);
await db.query(`DELETE FROM "SupportTicket"`);
await db.query(`DELETE FROM "StoreSubscription"`);
await db.query(`UPDATE "User" SET "sellerRequestStatus"=NULL`);

const admin = new C(), sipo = new C(), nico = new C(), buyer = new C(), anon = new C();
await admin.login("admin@test.cl"); await sipo.login("sel_sipo@t.cl"); await nico.login("sel_nico@t.cl");
const [b] = (await db.query(`SELECT email FROM "User" WHERE email LIKE 'b1-%' ORDER BY "createdAt" DESC LIMIT 1`)).rows;
await buyer.login(b.email, "ClaveSegura2026");

// sipo: tienda vigente. nico: sin plan.
const [pro] = (await db.query(`SELECT id FROM "StorePlan" WHERE code='PRO'`)).rows;
await db.query(`INSERT INTO "Store"(id,"sellerId","planId",status,"activeUntil","updatedAt") SELECT 'st'||u.id, u.id, $1, 'ACTIVE', now()+interval '30 days', now() FROM "User" u WHERE u.email='sel_sipo@t.cl' ON CONFLICT ("sellerId") DO UPDATE SET "planId"=$1, status='ACTIVE', "activeUntil"=now()+interval '30 days'`, [pro.id]);
await db.query(`UPDATE "Store" SET "planId"=NULL, "activeUntil"=NULL WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_nico@t.cl')`);

const counts = async (c) => (await c.req("/api/panel/counts")).data;

console.log("\n== Quien puede abrir tickets ==");
const T = { subject: "Mi QR no muestra el logo", category: "TIENDA", body: "Subi el logo pero el QR sale sin el." };
let r = await nico.req("/api/support/tickets", { method: "POST", json: T });
check("vendedor SIN plan NO puede (403)", r.status === 403, r.status);
r = await buyer.req("/api/support/tickets", { method: "POST", json: T });
check("comprador NO puede (403)", r.status === 403, r.status);
r = await anon.req("/api/support/tickets", { method: "POST", json: T });
check("anonimo NO puede (401)", r.status === 401, r.status);
r = await admin.req("/api/support/tickets", { method: "POST", json: T });
check("admin no abre tickets a si mismo (403)", r.status === 403, r.status);
r = await sipo.req("/api/support/tickets", { method: "POST", json: { ...T, subject: "ab" } });
check("asunto muy corto (400)", r.status === 400, r.status);
r = await sipo.req("/api/support/tickets", { method: "POST", json: { ...T, category: "XXX" } });
check("categoria invalida (400)", r.status === 400, r.status);
r = await sipo.req("/api/support/tickets", { method: "POST", json: { ...T, body: "esto es una mierda total" } });
check("groserias bloqueadas (400)", r.status === 400, r.status);

console.log("\n== Vendedor con plan abre ticket ==");
r = await sipo.req("/api/support/tickets", { method: "POST", json: T });
check("ticket creado (201)", r.status === 201, JSON.stringify(r.data));
const tk = r.data?.ticket;
check("codigo SP-XXXXXXXX", /^SP-[A-Z0-9]{8}$/.test(tk?.code ?? ""), tk?.code);
let c = await counts(admin);
check("ADMIN ve 1 ticket sin leer en sus avisos", c.tickets === 1, JSON.stringify(c));
c = await counts(sipo);
check("el vendedor NO tiene avisos de ticket", c.tickets === 0, JSON.stringify(c));

console.log("\n== Privacidad ==");
for (const [who, cl] of [["otro vendedor", nico], ["comprador", buyer]]) {
  r = await cl.req(`/api/support/tickets/${tk.id}`);
  check(`${who} NO lee el ticket (404/403)`, r.status === 404 || r.status === 403, r.status);
  r = await cl.req(`/api/support/tickets/${tk.id}/messages`, { method: "POST", json: { body: "hola" } });
  check(`${who} NO escribe en el ticket`, r.status === 404 || r.status === 403, r.status);
}
r = await anon.req(`/api/support/tickets/${tk.id}`);
check("anonimo NO lee (401)", r.status === 401, r.status);
r = await nico.req("/api/support/tickets");
check("lista del otro vendedor no incluye mi ticket", r.status === 200 && r.data.tickets.length === 0, JSON.stringify(r.data));
r = await nico.req(`/panel/soporte/${tk.id}`);
check("pagina del ticket ajeno -> 404", r.status === 404, r.status);
r = await buyer.req("/api/panel/counts");
check("comprador no consulta avisos del panel (403)", r.status === 403, r.status);
r = await anon.req("/api/panel/counts");
check("anonimo tampoco (401)", r.status === 401, r.status);

console.log("\n== Admin atiende ==");
r = await admin.req("/panel/soporte");
check("bandeja del admin lista el ticket", r.status === 200 && r.data.includes("Mi QR no muestra el logo") && r.data.includes("Pro"), r.status);
r = await admin.req(`/api/support/tickets/${tk.id}`);
check("admin abre el ticket (200) con 1 mensaje", r.status === 200 && r.data.messages.length === 1, JSON.stringify(r.data)?.slice(0, 200));
c = await counts(admin);
check("al abrirlo, el aviso del admin baja a 0", c.tickets === 0, JSON.stringify(c));
r = await admin.req(`/api/support/tickets/${tk.id}/messages`, { method: "POST", json: { body: "Hola, ya lo revisamos." } });
check("admin responde (201)", r.status === 201, JSON.stringify(r.data));
let [row] = (await db.query(`SELECT status, "sellerUnread", "adminUnread" FROM "SupportTicket" WHERE id=$1`, [tk.id])).rows;
check("estado ANSWERED y sin leer para el vendedor", row.status === "ANSWERED" && row.sellerUnread === true && row.adminUnread === false, JSON.stringify(row));
c = await counts(sipo);
check("VENDEDOR ve 1 respuesta sin leer", c.tickets === 1, JSON.stringify(c));
r = await sipo.req("/panel");
check("vendedor: /panel muestra 'Requiere tu atencion'", r.data.includes("Requiere tu atención") && r.data.includes("respuestas de soporte sin leer"), r.status);
r = await sipo.req(`/api/support/tickets/${tk.id}`);
check("vendedor lee la respuesta (2 mensajes)", r.data?.messages?.length === 2 && r.data.messages[1].fromAdmin === true);
c = await counts(sipo);
check("al leer, su aviso baja a 0", c.tickets === 0, JSON.stringify(c));

console.log("\n== Vendedor responde, cierra, admin reabre ==");
r = await sipo.req(`/api/support/tickets/${tk.id}/messages`, { method: "POST", json: { body: "Gracias, sigue igual." } });
check("vendedor responde (201)", r.status === 201);
c = await counts(admin);
check("admin vuelve a tener 1 aviso", c.tickets === 1, JSON.stringify(c));
r = await sipo.req(`/api/support/tickets/${tk.id}`, { method: "PATCH", json: { action: "close" } });
check("vendedor cierra su ticket (200)", r.status === 200);
c = await counts(admin);
check("ticket cerrado ya no cuenta como aviso", c.tickets === 0, JSON.stringify(c));
r = await sipo.req(`/api/support/tickets/${tk.id}/messages`, { method: "POST", json: { body: "aun cerrado" } });
check("no se escribe en ticket cerrado (409)", r.status === 409, r.status);
r = await sipo.req(`/api/support/tickets/${tk.id}`, { method: "PATCH", json: { action: "reopen" } });
check("vendedor NO reabre (403)", r.status === 403, r.status);
r = await admin.req(`/api/support/tickets/${tk.id}`, { method: "PATCH", json: { action: "reopen" } });
check("admin reabre (200)", r.status === 200);
[row] = (await db.query(`SELECT status FROM "SupportTicket" WHERE id=$1`, [tk.id])).rows;
check("queda OPEN", row.status === "OPEN");

console.log("\n== Limite de tickets abiertos ==");
await db.query(`DELETE FROM "LoginAttempt"`);
let last;
for (let i = 0; i < 5; i++) last = await sipo.req("/api/support/tickets", { method: "POST", json: { ...T, subject: `Consulta numero ${i}` } });
const open = (await db.query(`SELECT count(*) n FROM "SupportTicket" WHERE status<>'CLOSED'`)).rows[0].n;
check("no pasa de 5 abiertos", Number(open) === 5 && last.status === 409, `${open} abiertos, ultimo ${last.status}`);

console.log("\n== Membresia vencida ==");
await db.query(`UPDATE "Store" SET "activeUntil"=now()-interval '1 day' WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_sipo@t.cl')`);
r = await sipo.req("/api/support/tickets", { method: "POST", json: T });
check("vencido: NO abre tickets nuevos (403)", r.status === 403, r.status);
r = await sipo.req(`/api/support/tickets/${tk.id}/messages`, { method: "POST", json: { body: "vencido" } });
check("vencido: NO escribe en los existentes (403)", r.status === 403, r.status);
r = await sipo.req(`/api/support/tickets/${tk.id}`);
check("vencido: SI puede leer su historial (200)", r.status === 200);
r = await sipo.req("/panel/soporte");
check("vencido: pagina muestra bloqueo + historial", r.data.includes("Soporte directo con la membresía") && r.data.includes("Tus tickets"), r.status);
r = await admin.req(`/api/support/tickets/${tk.id}/messages`, { method: "POST", json: { body: "El admin siempre puede responder." } });
check("admin responde igual (201)", r.status === 201);
r = await nico.req("/panel/soporte");
check("sin plan: pagina bloqueada con enlace a planes", r.status === 200 && r.data.includes("Soporte directo con la membresía") && !r.data.includes("Nuevo ticket"));

console.log("\n== Avisos del admin: membresias y solicitudes ==");
await db.query(`UPDATE "Store" SET "activeUntil"=now()+interval '30 days' WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_sipo@t.cl')`);
await db.query(`DELETE FROM "LoginAttempt"`);
r = await nico.req("/api/store/subscribe", { method: "POST", json: { planCode: "TIENDA", months: 1 } });
const sub = r.data?.subscription;
c = await counts(admin);
check("sin comprobante todavia NO cuenta como aviso", c.subscriptions === 0, JSON.stringify(c));
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const fd = new FormData(); fd.append("file", new Blob([png], { type: "image/png" }), "c.png");
r = await nico.req(`/api/store/subscriptions/${sub.id}/receipt`, { method: "POST", form: fd });
check("nico sube comprobante", r.status === 201, r.status);
c = await counts(admin);
check("con comprobante: ADMIN ve 1 membresia por revisar", c.subscriptions === 1, JSON.stringify(c));
c = await counts(nico);
check("el vendedor NO ve avisos de membresias de admin", c.subscriptions === 0, JSON.stringify(c));
await db.query(`UPDATE "User" SET "sellerRequestStatus"='PENDING' WHERE id=$1`, [(await db.query(`SELECT id FROM "User" WHERE email=$1`, [b.email])).rows[0].id]);
c = await counts(admin);
check("ADMIN ve solicitud de vendedor pendiente", c.sellerRequests === 1, JSON.stringify(c));
r = await admin.req("/panel");
check("admin: /panel muestra 'Requiere tu atencion' con pagos y solicitudes", r.data.includes("Requiere tu atención") && r.data.includes("pagos de membresía") && r.data.includes("solicitudes para ser vendedor"));
r = await admin.req("/panel/soporte?estado=todos");
check("admin: filtro 'todos' funciona", r.status === 200 && r.data.includes("Consulta numero"));
await admin.req(`/api/admin/store-subscriptions/${sub.id}`, { method: "PATCH", json: { action: "reject", note: "prueba" } });
c = await counts(admin);
check("al resolver la membresia el aviso desaparece", c.subscriptions === 0, JSON.stringify(c));
await db.query(`UPDATE "User" SET "sellerRequestStatus"=NULL`);

console.log(`\nRESULTADO: ${passed} OK, ${failed} fallas`);
await db.end();
