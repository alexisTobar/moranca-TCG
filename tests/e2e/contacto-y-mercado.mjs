// Batería de pruebas de punta a punta. Ver tests/README.md para prepararla y ejecutarla.
// Cubre: contacto público sin cuenta, soporte del comprador en /cuenta, análisis de mercado y registro de búsquedas.
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const db = new pg.Client({ connectionString: process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/wctcg" });
await db.connect();
let passed = 0, failed = 0;
const check = (n, c, x = "") => (c ? (passed++, console.log("  OK   ", n)) : (failed++, console.log("  FALLA", n, x)));

class C {
  cookie = "";
  extra = "";
  async req(path, { method = "GET", json, headers = {} } = {}) {
    const res = await fetch(BASE + path, { method, headers: { cookie: [this.cookie, this.extra].filter(Boolean).join("; "), ...(json ? { "content-type": "application/json" } : {}), ...headers }, body: json ? JSON.stringify(json) : undefined, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) if (c.startsWith("dreamdeck_session=")) this.cookie = c.split(";")[0];
    const ct = res.headers.get("content-type") ?? "";
    return { status: res.status, location: res.headers.get("location"), data: ct.includes("json") ? await res.json().catch(() => null) : await res.text().catch(() => null) };
  }
  login(email, pw = "AdminTest2026!") { return this.req("/api/auth/login", { method: "POST", json: { email, password: pw } }); }
}
await db.query(`DELETE FROM "LoginAttempt"`);
await db.query(`DELETE FROM "ContactMessage"`);
await db.query(`DELETE FROM "SearchEvent"`);
await db.query(`DELETE FROM "SupportMessage"`);
await db.query(`DELETE FROM "SupportTicket"`);

const admin = new C(), nico = new C(), buyer = new C(), anon = new C();
await admin.login("admin@test.cl"); await nico.login("sel_nico@t.cl");
const [b] = (await db.query(`SELECT email FROM "User" WHERE email LIKE 'b1-%' ORDER BY "createdAt" DESC LIMIT 1`)).rows;
await buyer.login(b.email, "ClaveSegura2026");

console.log("\n== Contacto público (sin cuenta) ==");
let r = await anon.req("/ayuda");
check("/ayuda muestra el formulario de contacto", r.status === 200 && r.data.includes('id="contacto"') && r.data.includes("Enviar consulta"));
const msg = { name: "Visitante Prueba", email: "visitante@ejemplo.cl", topic: "CUENTA", subject: "No puedo ingresar", body: "Olvidé mi clave y no me llega el correo de recuperación." };
r = await anon.req("/api/contact", { method: "POST", json: { ...msg, email: "no-es-correo" } });
check("rechaza un correo inválido (400)", r.status === 400, r.status);
r = await anon.req("/api/contact", { method: "POST", json: { ...msg, website: "http://spam" } });
check("el campo trampa no guarda nada pero responde ok (anti-bots)", r.status === 200 && (await db.query(`SELECT count(*)::int n FROM "ContactMessage"`)).rows[0].n === 0, JSON.stringify(r.data));
r = await anon.req("/api/contact", { method: "POST", json: msg });
check("un visitante sin cuenta puede enviar una consulta (200)", r.status === 200 && /^SP-/.test(r.data?.code ?? ""), JSON.stringify(r.data));
const [saved] = (await db.query(`SELECT id, status, email FROM "ContactMessage" WHERE email=$1`, [msg.email])).rows;
check("queda guardada como pendiente", saved?.status === "OPEN");

r = await anon.req(`/api/admin/contact/${saved.id}`, { method: "PATCH", json: { action: "reply", reply: "Hola" } });
check("un anónimo NO puede responder (401)", r.status === 401, r.status);
r = await nico.req(`/api/admin/contact/${saved.id}`, { method: "PATCH", json: { action: "reply", reply: "Hola" } });
check("un vendedor NO puede responder (403)", r.status === 403, r.status);
r = await nico.req("/panel/contacto");
check("un vendedor no entra a la bandeja de contacto", r.status === 307 || (typeof r.data === "string" && !r.data.includes(msg.subject)), r.status);
r = await admin.req("/panel/contacto");
check("el admin ve la consulta en su bandeja", r.status === 200 && r.data.includes(msg.subject) && r.data.includes(msg.email));
r = await admin.req(`/api/admin/contact/${saved.id}`, { method: "PATCH", json: { action: "reply", reply: "Te enviamos un enlace nuevo para recuperar tu clave." } });
check("el admin responde (200)", r.status === 200, JSON.stringify(r.data));
const [answered] = (await db.query(`SELECT status, reply FROM "ContactMessage" WHERE id=$1`, [saved.id])).rows;
check("queda como respondida con el texto", answered.status === "ANSWERED" && answered.reply.includes("enlace nuevo"));
const [audited] = (await db.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='contact.reply'`)).rows;
check("la respuesta queda en la auditoría", audited.n >= 1);
for (let i = 0; i < 3; i++) r = await anon.req("/api/contact", { method: "POST", json: { ...msg, subject: `Insisto ${i}` } });
check("limita el abuso del formulario (429)", r.status === 429, r.status);

console.log("\n== Soporte del comprador en su cuenta ==");
r = await buyer.req("/cuenta");
check("Mi cuenta enlaza a soporte", r.status === 200 && r.data.includes('href="/cuenta/soporte"'));
r = await buyer.req("/cuenta/soporte");
check("/cuenta/soporte carga para el comprador", r.status === 200 && r.data.includes("Nueva consulta"));
r = await buyer.req("/api/support/tickets", { method: "POST", json: { subject: "Pago duplicado", category: "PAGO", body: "Transferí dos veces por error." } });
check("el comprador abre una consulta de pago (201)", r.status === 201, JSON.stringify(r.data));
const ticketId = r.data?.ticket?.id;
r = await buyer.req(`/cuenta/soporte/${ticketId}`);
check("ve el detalle de su consulta", r.status === 200 && r.data.includes("Pago duplicado"));
r = await nico.req(`/api/support/tickets/${ticketId}`);
check("otro usuario NO ve la consulta del comprador", r.status === 403 || r.status === 404, r.status);
r = await admin.req("/panel/soporte?estado=pendientes&tipo=compradores");
check("el admin la ve filtrando por compradores", r.status === 200 && r.data.includes("Pago duplicado"));
r = await admin.req(`/api/support/tickets/${ticketId}/messages`, { method: "POST", json: { body: "Ya revisamos tu caso, el vendedor te devolverá el pago." } });
check("el admin responde al comprador", r.status === 200 || r.status === 201, JSON.stringify(r.data));
r = await buyer.req(`/api/support/tickets/${ticketId}/messages`, { method: "POST", json: { body: "Gracias, quedo atento." } });
check("el comprador responde en su consulta", r.status === 200 || r.status === 201, JSON.stringify(r.data));
r = await nico.req("/cuenta/soporte");
check("un vendedor que entra a /cuenta/soporte va a su panel", r.status === 307 && (r.location ?? "").includes("/panel/soporte"), `${r.status} ${r.location}`);

console.log("\n== Análisis de mercado ==");
r = await nico.req("/panel/mercado");
check("un vendedor NO entra al análisis de mercado", r.status === 307 || (typeof r.data === "string" && !r.data.includes("Análisis de mercado")), r.status);
for (const dias of [7, 30, 90, 365]) {
  r = await admin.req(`/panel/mercado?dias=${dias}`);
  check(`el admin ve el análisis (${dias} días)`, r.status === 200 && r.data.includes("Ventas por juego") && r.data.includes("Lo que más buscan"), r.status);
}
r = await admin.req("/panel/mercado?dias=abc");
check("un periodo inválido usa 30 días", r.status === 200 && r.data.includes('aria-current="page"'));

console.log("\n== Registro de búsquedas (solo con consentimiento) ==");
const count = async () => (await db.query(`SELECT count(*)::int n FROM "SearchEvent"`)).rows[0].n;
const wait = () => new Promise((ok) => setTimeout(ok, 1200));
await anon.req("/cartas?q=pikachu"); await wait();
check("sin consentimiento NO se guarda la búsqueda", (await count()) === 0);
const consent = new C();
r = await consent.req("/api/consent", { method: "POST", json: { accepted: true, version: "2026-10-25" } });
check("se acepta el consentimiento vigente", r.status === 200, JSON.stringify(r.data));
consent.extra = "wc_analytics=yes; wc_consent_version=2026-10-25";
await consent.req("/cartas?q=%20PIKACHU%20%20ex"); await wait();
const [row] = (await db.query(`SELECT term, results FROM "SearchEvent" ORDER BY "createdAt" DESC LIMIT 1`)).rows;
check("con consentimiento se guarda la búsqueda normalizada", row?.term === "pikachu ex", JSON.stringify(row));
await consent.req("/cartas?q=pikachu", { headers: { "sec-gpc": "1" } }); await wait();
check("respeta Global Privacy Control", (await count()) === 1, await count());
await consent.req("/cartas?q=zzzz-no-existe"); await wait();
r = await admin.req("/panel/mercado");
check("el análisis muestra las búsquedas sin resultados", r.data.includes("zzzz-no-existe"));
const [cols] = (await db.query(`SELECT string_agg(column_name, ',') c FROM information_schema.columns WHERE table_name='SearchEvent'`)).rows;
check("la tabla de búsquedas no guarda datos personales", !/user|ip|email|session|visitor/i.test(cols.c), cols.c);

await db.end();
console.log(`\nRESULTADO: ${passed} OK, ${failed} fallas`);
process.exit(failed ? 1 : 0);
