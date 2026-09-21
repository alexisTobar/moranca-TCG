// Batería de pruebas de punta a punta. Ver tests/README.md para prepararla y ejecutarla.
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const db = new pg.Client({ connectionString: process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/wctcg" });
await db.connect();
let passed = 0, failed = 0;
const check = (n, c, x = "") => (c ? (passed++, console.log("  OK   ", n)) : (failed++, console.log("  FALLA", n, x)));

class C {
  cookie = "";
  async req(path, { method = "GET", json, form, headers = {} } = {}) {
    const res = await fetch(BASE + path, { method, headers: { cookie: this.cookie, ...(json ? { "content-type": "application/json" } : {}), ...headers }, body: json ? JSON.stringify(json) : form, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) if (c.startsWith("dreamdeck_session=")) this.cookie = c.split(";")[0];
    const ct = res.headers.get("content-type") ?? "";
    return { status: res.status, headers: res.headers, data: ct.includes("json") ? await res.json().catch(() => null) : await res.text().catch(() => null) };
  }
  login(email) { return this.req("/api/auth/login", { method: "POST", json: { email, password: "AdminTest2026!" } }); }
}
await db.query(`DELETE FROM "LoginAttempt"`);
const admin = new C(), sipo = new C(), nico = new C(), buyer = new C(), anon = new C();
check("admin login", (await admin.login("admin@test.cl")).status === 200);
check("sipo login", (await sipo.login("sel_sipo@t.cl")).status === 200);
check("nico login", (await nico.login("sel_nico@t.cl")).status === 200);
const [b] = (await db.query(`SELECT email FROM "User" WHERE email LIKE 'b1-%' ORDER BY "createdAt" DESC LIMIT 1`)).rows;
await buyer.req("/api/auth/login", { method: "POST", json: { email: b.email, password: "ClaveSegura2026" } });

// Estado limpio
await db.query(`DELETE FROM "StoreSubscription"`);
await db.query(`DELETE FROM "StoreVisitDay"`);
await db.query(`DELETE FROM "Store"`);
await db.query(`DELETE FROM "StorePlan"`);
// El admin necesita datos bancarios para recibir las transferencias de membresía
await db.query(`UPDATE "User" SET "bankName"='Banco Estado', "bankAccountType"='Cuenta Vista', "bankAccountNumber"='123456789', "bankHolderName"='Win Condition SpA', "bankRut"='76.123.456-7' WHERE email='admin@test.cl'`);

console.log("\n== Permisos ==");
let r = await buyer.req("/api/store/subscribe", { method: "POST", json: { planCode: "TIENDA", months: 1 } });
check("comprador NO puede suscribirse (403)", r.status === 403, r.status);
r = await anon.req("/api/store/subscribe", { method: "POST", json: { planCode: "TIENDA", months: 1 } });
check("anonimo NO puede suscribirse (401)", r.status === 401, r.status);
r = await buyer.req("/api/store", { method: "PUT", json: { tagline: "x" } });
check("comprador NO edita tienda (403)", r.status === 403, r.status);
r = await sipo.req("/api/admin/store-plans/xxx", { method: "PATCH", json: { priceMonthly: 1 } });
check("vendedor NO edita planes (403)", r.status === 403, r.status);
r = await sipo.req("/api/admin/stores/xxx", { method: "PATCH", json: { action: "suspend" } });
check("vendedor NO gestiona tiendas (403)", r.status === 403, r.status);

console.log("\n== Panel: sin plan, el vendedor ve los planes ==");
r = await sipo.req("/panel/tienda");
check("/panel/tienda carga (200)", r.status === 200, r.status);
check("/panel/tienda muestra precio 7.990", /7\.990/.test(r.data), "sin precio");
const plans = (await db.query(`SELECT id, code, "priceMonthly", "maxFeatured" FROM "StorePlan" ORDER BY "sortOrder"`)).rows;
check("planes por defecto creados", plans.length === 2, JSON.stringify(plans));
const P = Object.fromEntries(plans.map((p) => [p.code, p]));

console.log("\n== Sin membresia, la tienda no existe publica ==");
r = await anon.req("/tienda/sipo-tcg");
check("/tienda/sipo-tcg redirige al perfil", r.status >= 300 && r.status < 400 && /\/vendedor\/sipo-tcg/.test(r.headers.get("location") ?? ""), `${r.status} ${r.headers.get("location")}`);
r = await sipo.req("/api/store", { method: "PUT", json: { tagline: "Hola" } });
check("SIN plan no puede personalizar la tienda (403)", r.status === 403, r.status);
const [ns0] = (await db.query(`SELECT tagline FROM "Store" s JOIN "User" u ON u.id=s."sellerId" WHERE u.email='sel_sipo@t.cl'`)).rows;
check("y no se guardo nada", !ns0?.tagline, JSON.stringify(ns0));
r = await sipo.req("/panel/tienda");
check("panel muestra el editor bloqueado", r.data.includes("Disponible con tu membres") && !r.data.includes("Guardar"), "editor visible");
r = await anon.req("/tienda/no-existe");
check("tienda inexistente 404", r.status === 404, r.status);

console.log("\n== Suscripcion ==");
r = await sipo.req("/api/store/subscribe", { method: "POST", json: { planCode: "TIENDA", months: 2 } });
check("meses invalidos rechazados (400)", r.status === 400, r.status);
r = await sipo.req("/api/store/subscribe", { method: "POST", json: { planCode: "NOPE", months: 1 } });
check("plan inexistente (404)", r.status === 404, r.status);
r = await sipo.req("/api/store/subscribe", { method: "POST", json: { planCode: "TIENDA", months: 3 } });
check("solicitud creada (201)", r.status === 201, JSON.stringify(r.data));
const sub = r.data?.subscription;
check("monto = precio x meses", sub?.amount === P.TIENDA.priceMonthly * 3, sub?.amount);
check("referencia TI-XXXXXXXX", /^TI-[A-Z0-9]{8}$/.test(sub?.reference ?? ""), sub?.reference);
r = await sipo.req("/api/store/subscribe", { method: "POST", json: { planCode: "PRO", months: 1 } });
check("segunda solicitud pendiente rechazada (409)", r.status === 409, r.status);

console.log("\n== Comprobante privado ==");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
let fd = new FormData(); fd.append("file", new Blob([png], { type: "image/png" }), "c.png");
r = await sipo.req(`/api/store/subscriptions/${sub.id}/receipt`, { method: "POST", form: fd });
check("sube comprobante (201)", r.status === 201, JSON.stringify(r.data));
fd = new FormData(); fd.append("file", new Blob([Buffer.from("<script>alert(1)</script>")], { type: "image/png" }), "x.png");
r = await sipo.req(`/api/store/subscriptions/${sub.id}/receipt`, { method: "POST", form: fd });
check("archivo falso (no imagen) rechazado", r.status === 415, r.status);
fd = new FormData(); fd.append("file", new Blob([png], { type: "image/png" }), "c.png");
r = await nico.req(`/api/store/subscriptions/${sub.id}/receipt`, { method: "POST", form: fd });
check("otro vendedor NO sube a mi solicitud (404)", r.status === 404, r.status);
r = await sipo.req(`/api/store/subscriptions/${sub.id}/receipt`);
check("dueño ve su comprobante (200)", r.status === 200, r.status);
r = await admin.req(`/api/store/subscriptions/${sub.id}/receipt`);
check("admin ve el comprobante (200)", r.status === 200, r.status);
for (const [who, c] of [["otro vendedor", nico], ["comprador", buyer], ["anonimo", anon]]) {
  r = await c.req(`/api/store/subscriptions/${sub.id}/receipt`);
  check(`${who} NO ve el comprobante`, r.status === 404 || r.status === 401 || r.status === 403, r.status);
}
const [up] = (await db.query(`SELECT id, filename FROM "Upload" WHERE filename LIKE 'store-receipt:%' ORDER BY "createdAt" DESC LIMIT 1`)).rows;
check("comprobante guardado con prefijo privado", Boolean(up), "no hay Upload");
r = await anon.req(`/api/uploads/${up?.id}`);
check("/api/uploads/<id> NO lo expone (404)", r.status === 404, r.status);

console.log("\n== Admin aprueba ==");
r = await sipo.req(`/api/admin/store-subscriptions/${sub.id}`, { method: "PATCH", json: { action: "approve" } });
check("vendedor NO se aprueba solo (403)", r.status === 403, r.status);
r = await admin.req("/panel/tiendas");
check("/panel/tiendas carga y lista la solicitud", r.status === 200 && r.data.includes(sub.reference), `${r.status}`);
r = await admin.req(`/api/admin/store-subscriptions/${sub.id}`, { method: "PATCH", json: { action: "approve" } });
check("admin aprueba (200)", r.status === 200, JSON.stringify(r.data));
r = await admin.req(`/api/admin/store-subscriptions/${sub.id}`, { method: "PATCH", json: { action: "approve" } });
check("aprobar dos veces rechazado (409)", r.status === 409, r.status);
let [st] = (await db.query(`SELECT s.*, u.slug FROM "Store" s JOIN "User" u ON u.id=s."sellerId" WHERE u.email='sel_sipo@t.cl'`)).rows;
check("tienda ACTIVE con plan", st.status === "ACTIVE" && st.planId === P.TIENDA.id);
const days = (new Date(st.activeUntil) - Date.now()) / 86_400_000;
check("vigencia ~ 3 meses", days > 85 && days < 95, days.toFixed(1));
check("plan Tienda NO se destaca solo", st.featured === false);

console.log("\n== Personalizacion ==");
r = await sipo.req("/api/store", { method: "PUT", json: { displayName: "Sipo Cards", tagline: "Las mejores cartas", about: "Hola\ncomo estas", accentColor: "#0b7285", announcement: "Envios gratis sobre $30.000", whatsapp: "+56 9 1234 5678", instagram: "@sipo_cards", facebook: "https://facebook.com/sipo", website: "https://sipo.cl" } });
check("guarda tienda (200)", r.status === 200, JSON.stringify(r.data));
r = await sipo.req("/api/store", { method: "PUT", json: { accentColor: "rojo" } });
check("color invalido (400)", r.status === 400, r.status);
r = await sipo.req("/api/store", { method: "PUT", json: { website: "javascript:alert(1)" } });
check("website javascript: rechazado (400)", r.status === 400, r.status);
r = await sipo.req("/api/store", { method: "PUT", json: { logoUrl: "https://evil.example/x.png" } });
check("logo externo no permitido", r.status === 400, r.status);
const mine = (await db.query(`SELECT id FROM "Listing" WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_sipo@t.cl') AND status='ACTIVE'`)).rows;
const others = (await db.query(`SELECT id FROM "Listing" WHERE "sellerId"<>(SELECT id FROM "User" WHERE email='sel_sipo@t.cl') AND status='ACTIVE' LIMIT 1`)).rows;
r = await sipo.req("/api/store", { method: "PUT", json: { featuredListingIds: [others[0].id] } });
const [fo] = (await db.query(`SELECT "featuredListingIds" f FROM "Store" WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_sipo@t.cl')`)).rows;
check("publicaciones ajenas se descartan (no quedan destacadas)", !fo.f.includes(others[0].id), JSON.stringify(fo));
r = await sipo.req("/api/store", { method: "PUT", json: { featuredListingIds: mine.map((m) => m.id) } });
check("destaca las suyas (200)", r.status === 200, JSON.stringify(r.data));
await db.query(`UPDATE "StorePlan" SET "maxFeatured"=1 WHERE code='TIENDA'`);
r = await sipo.req("/api/store", { method: "PUT", json: { featuredListingIds: mine.map((m) => m.id) } });
check("respeta el maximo del plan (400)", mine.length > 1 ? r.status === 400 : true, r.status);
await db.query(`UPDATE "StorePlan" SET "maxFeatured"=6 WHERE code='TIENDA'`);
await sipo.req("/api/store", { method: "PUT", json: { featuredListingIds: mine.map((m) => m.id) } });

console.log("\n== Tienda publica ==");
r = await anon.req("/tienda/sipo-tcg");
check("tienda activa (200)", r.status === 200, r.status);
const html = r.data ?? "";
check("muestra nombre y tagline", html.includes("Sipo Cards") && html.includes("Las mejores cartas"));
check("barra de anuncio", html.includes("Envios gratis sobre $30.000"));
check("insignia verificada", html.includes("Tienda verificada"));
check("color de acento aplicado", html.includes("#0b7285") || /--color-brand/.test(html));
check("WhatsApp normalizado a wa.me", /wa\.me\/56912345678/.test(html));
check("Instagram normalizado", /instagram\.com\/sipo_cards/.test(html));
const titles = (await db.query(`SELECT title FROM "Listing" WHERE "sellerId"<>(SELECT id FROM "User" WHERE email='sel_sipo@t.cl') AND status='ACTIVE'`)).rows;
const mineTitles = new Set((await db.query(`SELECT title FROM "Listing" WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_sipo@t.cl')`)).rows.map((x) => x.title));
const leak = titles.find((t) => !mineTitles.has(t.title) && html.includes(t.title.replace(/&/g, "&amp;")));
check("no aparecen productos de otros vendedores", !leak, leak?.title);
check("marca Win Condition se mantiene", html.includes("Win Condition"));
check("mantiene el menu de Win Condition arriba (Cartas, Vendedores)", html.includes('href="/cartas"') && html.includes('href="/vendedores"'));
check("el logo de Win Condition lleva a la home", html.includes('aria-label="Win Condition TCG - inicio"'));
check("la tienda tiene ADEMAS su menu propio", html.includes('aria-label="Categorías de la tienda"'));
check("filtros del encabezado son de la tienda", html.includes('href="/tienda/sipo-tcg?game=') || html.includes('href="/tienda/sipo-tcg?type='));
check("buscador apunta a la tienda", html.includes('action="/tienda/sipo-tcg#catalogo"'));

console.log("\n== Visitas y QR ==");
await db.query(`DELETE FROM "StoreVisitDay"`);
await anon.req("/tienda/sipo-tcg");
await anon.req("/tienda/sipo-tcg?src=qr");
await anon.req("/tienda/sipo-tcg?src=qr");
await sipo.req("/tienda/sipo-tcg?src=qr");
await admin.req("/tienda/sipo-tcg");
const v = (await db.query(`SELECT sum(views) v, sum("qrScans") q FROM "StoreVisitDay"`)).rows[0];
check("3 visitas anonimas cuentan (dueno/admin no)", Number(v.v) === 3, JSON.stringify(v));
check("2 escaneos QR", Number(v.q) === 2, JSON.stringify(v));

console.log("\n== Links cortos ==");
r = await anon.req("/t/sipo-tcg?src=qr");
check("/t/slug -> /tienda/slug?src=qr", r.status >= 300 && r.status < 400 && /\/tienda\/sipo-tcg\?src=qr/.test(r.headers.get("location") ?? ""), r.headers.get("location"));
r = await anon.req("/v/pokepink");
check("/v/slug -> /vendedor/slug", /\/vendedor\/pokepink/.test(r.headers.get("location") ?? ""), r.headers.get("location"));
r = await anon.req("/t/no-existe");
check("/t/no-existe no rompe", r.status < 500, r.status);

console.log("\n== Perfil compartible (todos) ==");
r = await anon.req("/vendedor/pokepink");
check("perfil libre tiene boton compartir", r.status === 200 && r.data.includes("Compartir perfil"), r.status);
check("perfil libre NO tiene 'Ver su tienda'", !r.data.includes("Ver su tienda"));
r = await anon.req("/vendedor/sipo-tcg");
check("perfil premium enlaza a su tienda", r.data.includes("Ver su tienda"));
r = await nico.req("/panel/perfil");
check("/panel/perfil (libre) muestra Comparte tu perfil", r.status === 200 && r.data.includes("Comparte tu perfil"), r.status);
r = await sipo.req("/panel/tienda");
check("/panel/tienda (premium) carga con editor", r.status === 200 && r.data.includes("Sipo Cards"), r.status);

console.log("\n== Vitrina destacada ==");
r = await anon.req("/");
check("inicio sin tiendas destacadas: no hay vitrina", !r.data.includes("Tiendas oficiales"));
st = (await db.query(`SELECT id FROM "Store" s WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_sipo@t.cl')`)).rows[0];
r = await admin.req(`/api/admin/stores/${st.id}`, { method: "PATCH", json: { action: "feature", value: true } });
console.log("   feature en plan sin vitrina ->", r.status);
r = await anon.req("/");
check("plan sin showcase NO aparece en vitrina", !r.data.includes("Tiendas oficiales"));
r = await admin.req(`/api/admin/stores/${st.id}`, { method: "PATCH", json: { action: "grant", planCode: "PRO", months: 1 } });
check("admin regala/cambia a PRO (200)", r.status === 200, JSON.stringify(r.data));
r = await admin.req(`/api/admin/stores/${st.id}`, { method: "PATCH", json: { action: "feature", value: true } });
r = await anon.req("/");
check("PRO destacada aparece en el inicio", r.data.includes("Tiendas oficiales") && r.data.includes("Sipo Cards"));
r = await anon.req("/vendedores");
check("vendedores muestra insignia Tienda", />\s*Tienda\s*</.test(r.data) || r.data.includes("Tienda</span>"));

console.log("\n== Suspender / reanudar / cortar ==");
r = await admin.req(`/api/admin/stores/${st.id}`, { method: "PATCH", json: { action: "suspend" } });
check("suspender (200)", r.status === 200);
r = await anon.req("/tienda/sipo-tcg");
check("suspendida: redirige al perfil", r.status >= 300 && r.status < 400, r.status);
r = await anon.req("/");
check("suspendida: sale de la vitrina", !r.data.includes("Sipo Cards"));
r = await admin.req(`/api/admin/stores/${st.id}`, { method: "PATCH", json: { action: "resume" } });
r = await anon.req("/tienda/sipo-tcg");
check("reanudada: vuelve (200)", r.status === 200, r.status);
await db.query(`UPDATE "Store" SET "activeUntil"=now() - interval '1 day' WHERE id=$1`, [st.id]);
r = await anon.req("/tienda/sipo-tcg");
check("plan vencido: tienda deja de mostrarse", r.status >= 300 && r.status < 400, r.status);
r = await sipo.req("/api/store", { method: "PUT", json: { tagline: "vencida" } });
check("plan vencido: tampoco puede editar (403)", r.status === 403, r.status);
r = await admin.req(`/api/admin/stores/${st.id}`, { method: "PATCH", json: { action: "grant", planCode: "TIENDA", months: 1 } });
r = await anon.req("/tienda/sipo-tcg");
check("extender la reactiva", r.status === 200, r.status);
r = await admin.req(`/api/admin/stores/${st.id}`, { method: "PATCH", json: { action: "revoke" } });
r = await anon.req("/tienda/sipo-tcg");
check("revocada: sin tienda", r.status >= 300 && r.status < 400, r.status);

console.log("\n== Rechazo de solicitud ==");
r = await nico.req("/api/store/subscribe", { method: "POST", json: { planCode: "PRO", months: 1 } });
const s2 = r.data?.subscription;
check("nico crea solicitud", r.status === 201);
r = await admin.req(`/api/admin/store-subscriptions/${s2.id}`, { method: "PATCH", json: { action: "reject", note: "No llego la transferencia" } });
check("admin rechaza (200)", r.status === 200, JSON.stringify(r.data));
const [n] = (await db.query(`SELECT status, note FROM "StoreSubscription" WHERE id=$1`, [s2.id])).rows;
check("queda REJECTED con nota", n.status === "REJECTED" && /transferencia/.test(n.note ?? ""), JSON.stringify(n));
const [ns] = (await db.query(`SELECT "planId" FROM "Store" WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_nico@t.cl')`)).rows;
check("rechazo NO activa la tienda", !ns.planId);
r = await nico.req("/api/store/subscribe", { method: "POST", json: { planCode: "PRO", months: 1 } });
const s3 = r.data?.subscription;
r = await nico.req(`/api/store/subscriptions/${s3.id}`, { method: "DELETE" });
check("vendedor cancela su pendiente (200)", r.status === 200, r.status);

console.log("\n== Edicion de planes (admin) ==");
r = await admin.req(`/api/admin/store-plans/${P.TIENDA.id}`, { method: "PATCH", json: { priceMonthly: 12990, name: "Tienda Plus" } });
check("admin cambia precio/nombre (200)", r.status === 200, JSON.stringify(r.data));
r = await admin.req(`/api/admin/store-plans/${P.TIENDA.id}`, { method: "PATCH", json: { priceMonthly: -5 } });
check("precio negativo rechazado (400)", r.status === 400, r.status);
r = await nico.req("/panel/tienda");
check("vendedor ve el nuevo precio", r.data.includes("12.990") && r.data.includes("Tienda Plus"));
r = await nico.req("/api/store/subscribe", { method: "POST", json: { planCode: "TIENDA", months: 1 } });
check("nuevo cobro usa el precio actualizado", r.data?.subscription?.amount === 12990, r.data?.subscription?.amount);
await nico.req(`/api/store/subscriptions/${r.data?.subscription?.id}`, { method: "DELETE" });

console.log(`\nRESULTADO: ${passed} OK, ${failed} fallas`);
await db.end();
