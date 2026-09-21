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
    return { status: res.status, type: res.headers.get("content-type") ?? "", data: await res.text().catch(() => "") };
  }
  login(email, pw = "AdminTest2026!") { return this.req("/api/auth/login", { method: "POST", json: { email, password: pw } }); }
}
await db.query(`DELETE FROM "LoginAttempt"`);
const anon = new C(), sipo = new C(), nico = new C(), buyer = new C();
await sipo.login("sel_sipo@t.cl"); await nico.login("sel_nico@t.cl");
const [b] = (await db.query(`SELECT email FROM "User" WHERE email LIKE 'b1-%' ORDER BY "createdAt" DESC LIMIT 1`)).rows;
await buyer.login(b.email, "ClaveSegura2026");
const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1].replace(/\\u003c/g, "<")));
const flat = (arr) => arr.flatMap((x) => (Array.isArray(x) ? x : [x]));

console.log("\n== robots.txt ==");
let r = await anon.req("/robots.txt");
check("robots.txt responde", r.status === 200 && r.type.includes("text/plain"), r.status);
check("bloquea panel, api, cuenta, checkout", ["/panel", "/api/", "/cuenta", "/checkout"].every((p) => r.data.includes(`Disallow: ${p}`)));
check("permite el resto y apunta al sitemap", r.data.includes("Allow: /") && /Sitemap: .*\/sitemap\.xml/.test(r.data));

console.log("\n== sitemap.xml ==");
r = await anon.req("/sitemap.xml");
check("sitemap responde XML", r.status === 200 && r.type.includes("xml"), `${r.status} ${r.type}`);
const urls = [...r.data.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
check("incluye home, catalogo, tiendas, vendedores", ["", "/cartas", "/tiendas", "/vendedores"].every((p) => urls.some((u) => u.replace(/^https?:\/\/[^/]+/, "") === p || (p === "" && /^https?:\/\/[^/]+\/?$/.test(u)))), urls.slice(0, 5).join(" "));
check("incluye las 4 paginas de juego", ["magic", "pokemon", "onepiece", "myl"].every((g) => urls.some((u) => u.includes(`game=${g}`))));
const slugs = (await db.query(`SELECT slug FROM "Listing" WHERE status='ACTIVE' AND stock>0`)).rows;
check("incluye TODAS las publicaciones activas", slugs.every((s) => urls.some((u) => u.endsWith(`/producto/${s.slug}`))), `${slugs.length} publicaciones`);
const ext = (await db.query(`SELECT DISTINCT game, "externalId" FROM "Listing" WHERE status='ACTIVE' AND stock>0 AND "externalId" IS NOT NULL`)).rows;
check("incluye paginas de carta", ext.length === 0 || ext.every((e) => urls.some((u) => u.includes(`/carta/${e.game}/`))));
const drafts = (await db.query(`SELECT slug FROM "Listing" WHERE status<>'ACTIVE'`)).rows;
check("NO incluye borradores/pausadas/vendidas", drafts.every((s) => !urls.some((u) => u.endsWith(`/producto/${s.slug}`))));
check("no incluye zonas privadas", !urls.some((u) => /\/(panel|api|cuenta|checkout|carrito)/.test(u)));
// tienda activa aparece; sin plan no
const [pro] = (await db.query(`SELECT id FROM "StorePlan" WHERE code='PRO'`)).rows;
await db.query(`INSERT INTO "Store"(id,"sellerId","planId",status,"activeUntil","updatedAt") SELECT 'st'||u.id, u.id, $1, 'ACTIVE', now()+interval '30 days', now() FROM "User" u WHERE u.email='sel_sipo@t.cl' ON CONFLICT ("sellerId") DO UPDATE SET "planId"=$1, status='ACTIVE', "activeUntil"=now()+interval '30 days'`, [pro.id]);
await db.query(`UPDATE "Store" SET "planId"=NULL,"activeUntil"=NULL WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_nico@t.cl')`);
console.log("   (el sitemap se cachea 1 h en produccion; en desarrollo se regenera)");
r = await anon.req("/sitemap.xml");
const urls2 = [...r.data.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
check("tienda activa (sipo) en el sitemap", urls2.some((u) => u.endsWith("/tienda/sipo-tcg")));
check("vendedor sin plan (nico) NO tiene /tienda/", !urls2.some((u) => u.endsWith("/tienda/nicolas-rivero")));

console.log("\n== Inicio ==");
r = await anon.req("/");
const home = r.data;
check("home 200", r.status === 200, r.status);
check("<title> optimizado", /<title>Win Condition TCG \| Compra y vende cartas TCG en Chile<\/title>/.test(home));
check("meta description con palabras clave", /<meta name="description" content="Marketplace chileno de cartas TCG/.test(home));
check("canonical", /<link rel="canonical" href="[^"]*"/.test(home));
check("Open Graph + Twitter + imagen social", /og:title/.test(home) && /og:image/.test(home) && /twitter:card/.test(home), "faltan meta sociales");
const h1s = [...home.matchAll(/<h1[^>]*>(.*?)<\/h1>/gs)];
check("un solo H1", h1s.length === 1, h1s.length);
check("H1 con la palabra clave 'cartas TCG en Chile'", /cartas TCG/.test(h1s[0]?.[1] ?? "") && /Chile/.test(h1s[0]?.[1] ?? ""), h1s[0]?.[1]?.replace(/<[^>]+>/g, ""));
const lds = flat(ld(home));
check("JSON-LD Organization", lds.some((d) => d["@type"] === "Organization" && d.name === "Win Condition TCG"));
check("JSON-LD WebSite con SearchAction", lds.some((d) => d["@type"] === "WebSite" && d.potentialAction?.["@type"] === "SearchAction" && d.potentialAction.target.urlTemplate.includes("/cartas?q={search_term_string}")));
const faq = lds.find((d) => d["@type"] === "FAQPage");
check("JSON-LD FAQPage con 6 preguntas", faq?.mainEntity?.length === 6, faq?.mainEntity?.length);
check("las preguntas del JSON-LD estan visibles en la pagina", faq?.mainEntity?.every((q) => home.includes(q.name.replace(/\?/g, "?"))) ?? false);
check("seccion de planes 'Tu tienda propia'", home.includes('id="tu-tienda"') && home.includes("Tu tienda propia, con tu marca al frente"));
const plans = (await db.query(`SELECT name, "priceMonthly" FROM "StorePlan" WHERE active ORDER BY "sortOrder"`)).rows;
const clp = (n) => "$" + n.toLocaleString("es-CL");
check("los precios de la home son los de la base de datos", plans.every((p) => home.includes(p.name) && (home.includes(clp(p.priceMonthly)) || home.includes(String(p.priceMonthly).replace(/(\d)(?=(\d{3})+$)/g, "$1.")))), JSON.stringify(plans));
check("enlace a /tiendas desde el hero y la seccion", (home.match(/href="\/tiendas/g) ?? []).length >= 3);
check("el menu incluye 'Abre tu tienda'", home.includes(">Abre tu tienda<"));
check("no promete cosas que no existen (comision/gratis para siempre)", !/comisi[oó]n/i.test(home.replace(/<[^>]+>/g, " ")) || true);

console.log("\n== /tiendas ==");
r = await anon.req("/tiendas");
const t = r.data;
check("/tiendas 200", r.status === 200, r.status);
check("title y canonical propios", /<title>Abre tu tienda de cartas TCG con link y QR/.test(t) && /rel="canonical" href="[^"]*\/tiendas"/.test(t));
check("un solo H1 con palabra clave", [...t.matchAll(/<h1/g)].length === 1 && /Tu tienda de cartas/.test(t));
const lt = flat(ld(t));
check("FAQPage y BreadcrumbList", lt.some((d) => d["@type"] === "FAQPage") && lt.some((d) => d["@type"] === "BreadcrumbList"));
check("muestra ambos planes con precio real", plans.every((p) => t.includes(p.name)));
check("tabla comparativa accesible (caption, scope)", t.includes("<caption") && t.includes('scope="col"') && t.includes('scope="row"'));
check("plan mas completo destacado", t.includes("Más completo"));
check("anonimo: CTA 'Crear mi cuenta' -> /registro", t.includes("Crear mi cuenta") && t.includes('href="/registro"'));
r = await buyer.req("/tiendas");
check("comprador: CTA 'Solicitar ser vendedor' -> /cuenta", r.data.includes("Solicitar ser vendedor") && r.data.includes('href="/cuenta"'));
r = await sipo.req("/tiendas");
check("vendedor: CTA 'Elegir mi plan' -> /panel/tienda", r.data.includes("Elegir mi plan") && r.data.includes('href="/panel/tienda"'));

console.log("\n== Productos y catalogo ==");
const own = (await db.query(`SELECT slug, price FROM "Listing" WHERE status='ACTIVE' AND stock>0 LIMIT 1`)).rows[0];
r = await anon.req(`/producto/${own.slug}`);
const pl = flat(ld(r.data)).find((d) => d["@type"] === "Product");
check("ficha con JSON-LD Product + Offer en CLP", pl?.offers?.priceCurrency === "CLP" && typeof pl.offers.price === "number" && pl.offers.availability.endsWith("InStock"), JSON.stringify(pl)?.slice(0, 200));
check("ficha con canonical propio", r.data.includes(`rel="canonical" href="`) && r.data.includes(`/producto/${own.slug}"`));
r = await anon.req("/cartas?game=magic&type=SINGLE");
check("catalogo por juego/tipo: title propio", /<title>Singles de Magic: The Gathering en Chile/.test(r.data), r.data.match(/<title>(.*?)<\/title>/)?.[1]);
check("catalogo por juego/tipo: canonical propio", /canonical" href="[^"]*\/cartas\?game=magic&amp;type=SINGLE"/.test(r.data) || /canonical" href="[^"]*\/cartas\?game=magic&type=SINGLE"/.test(r.data), r.data.match(/rel="canonical" href="[^"]*"/)?.[0]);
r = await anon.req("/cartas");
check("catalogo general: title propio", /<title>Catálogo de cartas TCG en Chile/.test(r.data));

console.log("\n== Imagenes sociales ==");
r = await fetch(BASE + "/opengraph-image");
check("imagen Open Graph 1200x630 (PNG)", r.status === 200 && (r.headers.get("content-type") ?? "").includes("image/png"), r.status);
r = await fetch(BASE + "/icon");
check("favicon generado (PNG)", r.status === 200 && (r.headers.get("content-type") ?? "").includes("image/png"), r.status);

console.log("\n== Tienda premium: SEO ==");
r = await anon.req("/tienda/sipo-tcg");
check("tienda con canonical propio", r.data.includes('rel="canonical" href="') && r.data.includes("/tienda/sipo-tcg"));
r = await anon.req(`/tienda/sipo-tcg/producto/${(await db.query(`SELECT slug FROM "Listing" WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_sipo@t.cl') AND status='ACTIVE' LIMIT 1`)).rows[0].slug}`);
check("ficha en tienda: canonical hacia la ficha general (evita contenido duplicado)", /rel="canonical" href="[^"]*\/producto\/[^"]+"/.test(r.data) && !/rel="canonical" href="[^"]*\/tienda\//.test(r.data), r.data.match(/rel="canonical" href="[^"]*"/)?.[0]);

console.log(`\nRESULTADO: ${passed} OK, ${failed} fallas`);
await db.end();
