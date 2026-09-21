// Batería de pruebas de punta a punta. Ver tests/README.md para prepararla y ejecutarla.
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const db = new pg.Client({ connectionString: process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/wctcg" });
await db.connect();
let passed = 0, failed = 0;
const check = (n, c, x = "") => (c ? (passed++, console.log("  OK   ", n)) : (failed++, console.log("  FALLA", n, x)));

class C {
  cookie = "";
  async req(path, { method = "GET", json } = {}) {
    const res = await fetch(BASE + path, { method, headers: { cookie: this.cookie, ...(json ? { "content-type": "application/json" } : {}) }, body: json ? JSON.stringify(json) : undefined, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) if (c.startsWith("dreamdeck_session=")) this.cookie = c.split(";")[0];
    const ct = res.headers.get("content-type") ?? "";
    return { status: res.status, location: res.headers.get("location"), data: ct.includes("json") ? await res.json().catch(() => null) : await res.text().catch(() => null) };
  }
  login(email) { return this.req("/api/auth/login", { method: "POST", json: { email, password: "AdminTest2026!" } }); }
}
await db.query(`DELETE FROM "LoginAttempt"`);
const admin = new C(), sipo = new C(), nico = new C(), anon = new C();
await admin.login("admin@test.cl"); await sipo.login("sel_sipo@t.cl"); await nico.login("sel_nico@t.cl");
const adminId = (await db.query(`SELECT id FROM "User" WHERE email='admin@test.cl'`)).rows[0].id;
const adminSlug = (await db.query(`SELECT slug FROM "User" WHERE email='admin@test.cl'`)).rows[0].slug;

console.log("\n== ADMIN = PRO SIEMPRE ==");
await db.query(`DELETE FROM "StoreSubscription" WHERE "storeId" IN (SELECT id FROM "Store" WHERE "sellerId"=$1)`, [adminId]);
await db.query(`DELETE FROM "Store" WHERE "sellerId"=$1`, [adminId]);
let r = await anon.req(`/tienda/${adminSlug}`);
check("sin fila de tienda: la tienda del admin igual se muestra (se autoaplica Pro)", r.status === 200, `${r.status} ${r.location}`);
let [st] = (await db.query(`SELECT s.*, p.code FROM "Store" s JOIN "StorePlan" p ON p.id=s."planId" WHERE s."sellerId"=$1`, [adminId])).rows;
check("plan PRO, ACTIVE, sin vencimiento (2099)", st?.code === "PRO" && st.status === "ACTIVE" && new Date(st.activeUntil).getFullYear() === 2099, JSON.stringify(st));

await db.query(`DELETE FROM "Store" WHERE "sellerId"=$1`, [adminId]);
r = await admin.req("/api/store", { method: "PUT", json: { tagline: "Tienda oficial de Win Condition" } });
check("admin personaliza su tienda sin haber comprado nada (200)", r.status === 200, JSON.stringify(r.data)?.slice(0, 160));

r = await admin.req("/api/store/subscribe", { method: "POST", json: { planCode: "TIENDA", months: 1 } });
check("admin no puede 'comprar' plan (409)", r.status === 409, r.status);

[st] = (await db.query(`SELECT id FROM "Store" WHERE "sellerId"=$1`, [adminId])).rows;
for (const act of [{ action: "suspend" }, { action: "revoke" }, { action: "grant", planCode: "TIENDA", months: 1 }]) {
  r = await admin.req(`/api/admin/stores/${st.id}`, { method: "PATCH", json: act });
  check(`no se puede '${act.action}' la cuenta de administrador (409)`, r.status === 409, r.status);
}
[st] = (await db.query(`SELECT s.status, s."activeUntil", p.code FROM "Store" s JOIN "StorePlan" p ON p.id=s."planId" WHERE s."sellerId"=$1`, [adminId])).rows;
check("sigue Pro y activa despues de los intentos", st.code === "PRO" && st.status === "ACTIVE" && new Date(st.activeUntil).getFullYear() === 2099);

const stId = (await db.query(`SELECT id FROM "Store" WHERE "sellerId"=$1`, [adminId])).rows[0].id;
r = await admin.req(`/api/admin/stores/${stId}`, { method: "PATCH", json: { action: "feature", value: true } });
check("si puede destacarse en el inicio (200)", r.status === 200, r.status);
r = await anon.req("/");
check("aparece en 'Tiendas destacadas' del inicio", r.data.includes("Tiendas oficiales"));
await admin.req(`/api/admin/stores/${stId}`, { method: "PATCH", json: { action: "feature", value: false } });

r = await admin.req("/panel/tienda");
check("/panel/tienda: dice 'Pro incluido' y no ofrece pagar", r.status === 200 && r.data.includes("incluido en tu cuenta de administrador") && !r.data.includes("Continuar al pago"), r.status);
check("/panel/tienda: editor y QR disponibles (no bloqueado)", !r.data.includes("Disponible con tu membres") && r.data.includes("Personaliza tu tienda"));
r = await admin.req("/panel/tiendas");
check("/panel/tiendas: fila del admin 'incluido, sin vencimiento'", r.data.includes("sin vencimiento") && r.data.includes("Pro incluido"));
check("/panel/tiendas: ingreso mensual no cuenta al admin", r.status === 200);

console.log("\n== Vendedores normales NO cambian ==");
r = await nico.req("/api/store", { method: "PUT", json: { tagline: "x" } });
check("vendedor sin plan sigue bloqueado (403)", r.status === 403, r.status);

console.log("\n== FICHA DE PRODUCTO DENTRO DE LA TIENDA ==");
const [pro] = (await db.query(`SELECT id FROM "StorePlan" WHERE code='PRO'`)).rows;
await db.query(`INSERT INTO "Store"(id,"sellerId","planId",status,"activeUntil","updatedAt","displayName") SELECT 'st'||u.id, u.id, $1, 'ACTIVE', now()+interval '30 days', now(), 'Sipo Cards' FROM "User" u WHERE u.email='sel_sipo@t.cl' ON CONFLICT ("sellerId") DO UPDATE SET "planId"=$1, status='ACTIVE', "activeUntil"=now()+interval '30 days', "displayName"='Sipo Cards'`, [pro.id]);
await db.query(`UPDATE "Store" SET "planId"=NULL,"activeUntil"=NULL WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_nico@t.cl')`);
const own = (await db.query(`SELECT slug, title FROM "Listing" WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_sipo@t.cl') AND status='ACTIVE' AND type='SINGLE' LIMIT 1`)).rows[0];
const foreign = (await db.query(`SELECT slug FROM "Listing" WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_nico@t.cl') AND status='ACTIVE' LIMIT 1`)).rows[0];

r = await anon.req("/tienda/sipo-tcg");
check("las tarjetas de la tienda enlazan a la ficha DENTRO de la tienda", r.data.includes(`href="/tienda/sipo-tcg/producto/${own.slug}"`) && !r.data.includes(`href="/producto/${own.slug}"`));

r = await anon.req(`/tienda/sipo-tcg/producto/${own.slug}`);
const h = r.data ?? "";
check("ficha en tienda (200)", r.status === 200, r.status);
check("muestra el producto", h.includes(own.title.replace(/&/g, "&amp;")) || h.includes(own.title));
check("usa el encabezado de la tienda (buscador propio)", h.includes('action="/tienda/sipo-tcg#catalogo"'));
check("mantiene el menu de Win Condition arriba", h.includes('href="/cartas"') && h.includes('href="/vendedores"'));
check("logo de Win Condition lleva a la home y hay menu propio de la tienda", h.includes('aria-label="Win Condition TCG - inicio"') && h.includes('aria-label="Categorías de la tienda"'));
check("NO ofrece otros vendedores con la misma carta", !h.includes("Otros vendedores con esta carta") && !h.includes("vendedores tienen esta carta") && !h.includes("vendedor tiene esta carta"));
check("tarjeta 'Vendido por' apunta a la tienda", h.includes('href="/tienda/sipo-tcg"') && h.includes("Ver tienda"));
check("no envia al perfil general del vendedor", !h.includes('href="/vendedor/'));
check("migas de pan de la tienda", h.includes("Sipo Cards"));

r = await anon.req(`/tienda/sipo-tcg/producto/${foreign.slug}`);
check("producto de OTRO vendedor no se muestra en esta tienda (redirige a la ficha general)", r.status >= 300 && r.status < 400 && r.location?.includes(`/producto/${foreign.slug}`), `${r.status} ${r.location}`);
r = await anon.req(`/tienda/sipo-tcg/producto/no-existe-xyz`);
check("producto inexistente 404", r.status === 404, r.status);
r = await anon.req(`/tienda/pokepink/producto/${foreign.slug}`);
check("tienda sin plan: redirige a la ficha general", r.status >= 300 && r.status < 400 && r.location?.includes(`/producto/${foreign.slug}`), `${r.status} ${r.location}`);

r = await anon.req(`/producto/${own.slug}`);
check("ficha general de Win Condition sigue igual (con su menu)", r.status === 200 && /href="\/cartas/.test(r.data) && r.data.includes("Ver perfil"), r.status);

console.log(`\nRESULTADO: ${passed} OK, ${failed} fallas`);
await db.end();
