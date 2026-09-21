// Batería de pruebas de punta a punta. Ver tests/README.md para prepararla y ejecutarla.
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const db = new pg.Client({ connectionString: process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/wctcg" });
await db.connect();
let passed = 0, failed = 0;
const check = (n, c, x = "") => (c ? (passed++, console.log("  OK   ", n)) : (failed++, console.log("  FALLA", n, x)));
const get = async (path) => {
  const res = await fetch(BASE + path, { redirect: "manual" });
  return { status: res.status, data: await res.text() };
};
const post = async (path, json) => {
  const res = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(json) });
  return { status: res.status, data: await res.json().catch(() => null) };
};
const text = (h) => h.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");
await db.query(`DELETE FROM "LoginAttempt"`);
// Preparacion: planes y una tienda activa (sipo) para revisar las paginas de tienda
for (const [code, name, price, mf, adv, sc, so] of [["TIENDA", "Tienda", 4990, 6, false, false, 1], ["PRO", "Tienda Pro", 7990, 12, true, true, 2]]) {
  await db.query(`INSERT INTO "StorePlan"(id,code,name,"priceMonthly","maxFeatured","advancedStats",showcase,"sortOrder","updatedAt") VALUES ('pl'||$1,$1,$2,$3,$4,$5,$6,$7,now()) ON CONFLICT (code) DO NOTHING`, [code, name, price, mf, adv, sc, so]);
}
const [proPlan] = (await db.query(`SELECT id FROM "StorePlan" WHERE code='PRO'`)).rows;
await db.query(`INSERT INTO "Store"(id,"sellerId","planId",status,"activeUntil","updatedAt") SELECT 'st'||u.id, u.id, $1, 'ACTIVE', now()+interval '30 days', now() FROM "User" u WHERE u.email='sel_sipo@t.cl' ON CONFLICT ("sellerId") DO UPDATE SET "planId"=$1, status='ACTIVE', "activeUntil"=now()+interval '30 days'`, [proPlan.id]);

console.log("\n== Paginas legales ==");
const pages = [
  ["/terminos-y-condiciones", /Términos y condiciones/, "un marketplace", "No recibimos, retenemos ni administramos el dinero"],
  ["/politica-de-privacidad", /Política de privacidad/, "dreamdeck_session", "No usamos cookies de publicidad ni herramientas de analítica de terceros"],
  ["/devoluciones", /Devoluciones y reclamos/, "no realiza devoluciones ni reembolsos", "Quién hace qué"],
  ["/quienes-somos", /Quiénes somos/, "Lo que somos, y lo que no", "Juegos"],
];
for (const [path, titleRe, mustA, mustB] of pages) {
  const { status, data } = await get(path);
  const t = text(data);
  check(`${path} responde 200`, status === 200, status);
  check(`${path}: <title> y canonical propios`, titleRe.test(data.match(/<title>(.*?)<\/title>/)?.[1] ?? "") && data.includes(`rel="canonical" href="`) && data.includes(path), data.match(/<title>(.*?)<\/title>/)?.[1]);
  check(`${path}: un solo H1`, [...data.matchAll(/<h1/g)].length === 1);
  check(`${path}: contenido clave presente`, t.includes(mustA) && t.includes(mustB), `${t.includes(mustA)} ${t.includes(mustB)}`);
  if (path !== "/quienes-somos") {
    const ids = [...data.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
    const anchors = [...data.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    check(`${path}: indice lateral apunta a secciones reales (${ids.length})`, ids.length >= 6 && ids.every((i) => anchors.includes(i)), `${ids.length} secciones`);
    check(`${path}: fecha de ultima actualizacion visible`, t.includes("Última actualización: 20 de septiembre de 2026"));
    check(`${path}: enlaza a los otros documentos`, ["/terminos-y-condiciones", "/politica-de-privacidad", "/devoluciones"].filter((p) => p !== path).every((p) => data.includes(`href="${p}`)));
  }
}
let r = await get("/quienes-somos");
check("quienes somos muestra cifras reales de la base", (() => { const n = Number((r.data.match(/([\d.]+)<\/dt><dd[^>]*>Publicaciones activas/) ?? [])[1]?.replace(/\./g, "")); return Number.isFinite(n); })());
check("AboutPage JSON-LD", r.data.includes('"@type":"AboutPage"'));

console.log("\n== Coherencia de los textos con la plataforma ==");
r = await get("/terminos-y-condiciones");
const tt = text(r.data);
check("terminos: el pago va directo al vendedor y no manejamos ese dinero", tt.includes("el pago se transfiere directamente a la cuenta del vendedor"));
check("terminos: orden se cancela sola al vencer el plazo", tt.includes("cancela automáticamente"));
check("terminos: membresias sin renovacion automatica", tt.includes("No hay renovación automática"));
check("terminos: cita Ley 19.496 y SERNAC", tt.includes("Ley N° 19.496") && tt.includes("SERNAC"));
r = await get("/devoluciones");
const td = text(r.data);
check("devoluciones: aclara que no hay reembolso propio ni manejo de dinero", td.includes("no realiza devoluciones ni reembolsos") && td.includes("no manejamos el dinero"));
check("devoluciones: tabla de quien hace que + pasos", td.includes("Comprador") && td.includes("Vendedor") && td.includes("Win Condition TCG") && td.includes("Junta pruebas"));
check("devoluciones: NO promete garantia de reembolso ni 'compra protegida'", !/compra protegida/i.test(td) && td.includes("no significa garantizar un reembolso"));
r = await get("/politica-de-privacidad");
const tp = text(r.data);
check("privacidad: cookies reales (sesion, region, carrito)", tp.includes("dreamdeck_session") && tp.includes("wc_region") && tp.includes("dreamdeck_cart_v1"));
check("privacidad: menciona Ley 19.628 y 21.719 y derechos de acceso/rectificacion/supresion", tp.includes("19.628") && tp.includes("21.719") && tp.includes("Acceso") && tp.includes("Rectificación") && tp.includes("Supresión"));
check("privacidad: no vendemos datos", tp.includes("No vendemos ni arrendamos datos personales"));
check("sin email inventado: no hay 'mailto:' si no hay NEXT_PUBLIC_CONTACT_EMAIL", !process.env.NEXT_PUBLIC_CONTACT_EMAIL ? !r.data.includes("mailto:") : true);

console.log("\n== Footer ==");
for (const path of ["/", "/cartas", "/tienda/sipo-tcg"]) {
  const { data } = await get(path);
  const foot = data.slice(data.lastIndexOf("<footer"));
  check(`footer en ${path}: Quienes somos, Terminos, Privacidad, Devoluciones`, ["/quienes-somos", "/terminos-y-condiciones", "/politica-de-privacidad", "/devoluciones"].every((p) => foot.includes(`href="${p}"`)), `hay footer: ${data.includes("<footer")}`);
}

console.log("\n== Sitemap ==");
r = await get("/sitemap.xml");
check("sitemap incluye las 4 paginas", ["/quienes-somos", "/terminos-y-condiciones", "/politica-de-privacidad", "/devoluciones"].every((p) => r.data.includes(`${p}</loc>`)));

console.log("\n== Registro: aceptacion de terminos ==");
r = await get("/registro");
check("formulario de registro con casilla obligatoria y enlaces", r.data.includes('name="acceptTerms"') && r.data.includes("required") && r.data.includes('href="/terminos-y-condiciones"') && r.data.includes('href="/politica-de-privacidad"'));
const stamp = Date.now();
const base = { name: "Prueba Legal", email: `legal-${stamp}@test.cl`, password: "ClaveSegura2026", rut: "11.111.111-1", phone: "+56 9 1234 5678", address: "Calle Falsa 123" };
let x = await post("/api/auth/register", base);
check("sin aceptar terminos (campo ausente): rechazado (400)", x.status === 400, `${x.status} ${JSON.stringify(x.data)}`);
x = await post("/api/auth/register", { ...base, acceptTerms: false });
check("acceptTerms=false: rechazado (400) con mensaje claro", x.status === 400 && /Términos/.test(x.data?.error ?? ""), `${x.status} ${x.data?.error}`);
x = await post("/api/auth/register", { ...base, acceptTerms: "true" });
check("acceptTerms como texto: rechazado (400)", x.status === 400, x.status);
const before = (await db.query(`SELECT count(*) n FROM "User" WHERE email=$1`, [base.email])).rows[0].n;
check("las cuentas rechazadas no se crearon", Number(before) === 0);
x = await post("/api/auth/register", { ...base, acceptTerms: true });
check("aceptando: cuenta creada (201)", x.status === 201, `${x.status} ${JSON.stringify(x.data)}`);
const [u] = (await db.query(`SELECT "termsAcceptedAt", "termsVersion" FROM "User" WHERE email=$1`, [base.email])).rows;
check("queda la constancia: fecha y version de los terminos", u?.termsAcceptedAt && Math.abs(Date.now() - new Date(u.termsAcceptedAt).getTime()) < 6 * 3600 * 1000 && u.termsVersion === "2026-09", JSON.stringify(u));
await db.query(`DELETE FROM "User" WHERE email=$1`, [base.email]);

console.log("\n== Planes base (mas accesibles) y marketing honesto ==");
const saved = (await db.query(`SELECT * FROM "StorePlan"`)).rows;
await db.query(`DELETE FROM "StoreSubscription"`);
await db.query(`DELETE FROM "Store"`);
await db.query(`DELETE FROM "StorePlan"`);
r = await get("/tiendas");
const tm = text(r.data);
check("con la base vacia, /tiendas muestra los planes por defecto: $4.990 y $7.990", tm.includes("$4.990") && tm.includes("$7.990"), tm.match(/\$\d[\d.]*/g)?.slice(0, 6).join(" "));
const n = (await db.query(`SELECT count(*) n FROM "StorePlan"`)).rows[0].n;
check("y una pagina publica NO escribe en la base (sigue sin planes)", Number(n) === 0, n);
check("beneficios: publicaciones ilimitadas", tm.includes("Publicaciones ilimitadas"));
check("franja: 0% de comision por venta", tm.includes("0% de comisión por venta"));
check("FAQ: comision y courier", tm.includes("¿Cobran comisión por mis ventas?") && tm.includes("¿Con qué courier despacho?"));
r = await get("/");
check("home menciona 'sin comisiones por venta'", text(r.data).includes("Sin comisiones por venta"));
// restaurar planes tal como estaban
for (const p of saved) {
  await db.query(`INSERT INTO "StorePlan"(id,code,name,description,"priceMonthly",active,"maxFeatured","advancedStats",showcase,"sortOrder","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now()) ON CONFLICT DO NOTHING`, [p.id, p.code, p.name, p.description, p.priceMonthly, p.active, p.maxFeatured, p.advancedStats, p.showcase, p.sortOrder, p.createdAt]);
}

console.log(`\nRESULTADO: ${passed} OK, ${failed} fallas`);
await db.end();
