import { checkoutPayload } from "./checkout-payload.mjs";
// Batería de seguridad. Ver tests/README.md para prepararla y ejecutarla.
// Comprueba que el token de sesión y los secretos del servidor no se vean en ningún lugar accesible
// (HTML, JSON, JavaScript del navegador, URLs), quién puede comprar y publicar, que nadie lea datos ajenos,
// que no se acepten tokens falsificados y que cerrar sesión invalide el token.
import pg from "pg";
import fs from "node:fs";
import { SignJWT } from "jose";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const db = new pg.Client({ connectionString: process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/wctcg" });
await db.connect();
let passed = 0, failed = 0;
const check = (n, c, x = "") => (c ? (passed++, console.log("  OK   ", n)) : (failed++, console.log("  FALLA", n, x)));

class C {
  cookie = "";
  setCookies = [];
  async req(path, { method = "GET", json, headers = {} } = {}) {
    if (path === "/api/checkout" && json && !json.idempotencyKey) json = await checkoutPayload(this, json);
    const res = await fetch(BASE + path, { method, headers: { cookie: this.cookie, ...(json ? { "content-type": "application/json" } : {}), ...headers }, body: json ? JSON.stringify(json) : undefined, redirect: "manual" });
    this.setCookies = res.headers.getSetCookie?.() ?? [];
    for (const c of this.setCookies) if (c.startsWith("dreamdeck_session=")) this.cookie = c.split(";")[0];
    const ct = res.headers.get("content-type") ?? "";
    const raw = await res.text().catch(() => "");
    let data = raw;
    if (ct.includes("json")) { try { data = JSON.parse(raw); } catch { data = null; } }
    return { status: res.status, headers: res.headers, location: res.headers.get("location"), data, raw };
  }
  login(email, pw = "AdminTest2026!") { return this.req("/api/auth/login", { method: "POST", json: { email, password: pw } }); }
  get token() { return this.cookie.split("=")[1] ?? ""; }
}
await db.query(`DELETE FROM "LoginAttempt"`);

// Secretos reales del servidor de pruebas (de .env). Nunca se imprimen: solo se buscan.
const env = Object.fromEntries((fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=("?)(.*)\2$/)).filter(Boolean).map((m) => [m[1], m[3]]));
const SECRETS = ["AUTH_SECRET", "CRON_SECRET", "RESEND_API_KEY", "DATABASE_URL", "DIRECT_URL", "MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET", "ADMIN_PASSWORD", "POKEMONTCG_API_KEY", "TCGPLAYER_PRIVATE_KEY", "GOOGLE_CLIENT_SECRET"]
  .map((k) => [k, env[k] ?? process.env[k]]).filter(([, v]) => v && v.length >= 8);
const leaks = (text) => SECRETS.filter(([, v]) => text.includes(v)).map(([k]) => k);

const buyer = new C(), buyer2 = new C(), seller = new C(), storeSeller = new C(), other = new C(), admin = new C(), anon = new C();
const [b1] = (await db.query(`SELECT email FROM "User" WHERE email LIKE 'b1-%' ORDER BY "createdAt" DESC LIMIT 1`)).rows;
const [b2] = (await db.query(`SELECT email FROM "User" WHERE email LIKE 'b2-%' ORDER BY "createdAt" DESC LIMIT 1`)).rows;

console.log("\n== Cookie de sesión ==");
let r = await buyer.login(b1.email, "ClaveSegura2026");
const sessionCookie = buyer.setCookies.find((c) => c.startsWith("dreamdeck_session=")) ?? "";
check("el login responde 200", r.status === 200, r.status);
check("la cookie es HttpOnly (JavaScript no la puede leer)", /;\s*HttpOnly/i.test(sessionCookie), sessionCookie.replace(/=[^;]+/, "=***"));
check("la cookie es SameSite=Lax", /;\s*SameSite=Lax/i.test(sessionCookie));
check("la cookie tiene vencimiento", /;\s*Max-Age=\d+/i.test(sessionCookie));
const authSource = fs.readFileSync("src/lib/auth.ts", "utf8");
check("en producción la cookie solo viaja por HTTPS (Secure)", /secure:\s*process\.env\.NODE_ENV === "production"/.test(authSource));
check("la respuesta del login NO incluye el token", !r.raw.includes(buyer.token) && !/eyJ[\w-]+\.[\w-]+\.[\w-]+/.test(r.raw));
check("la respuesta del login NO incluye el hash de la clave", !/\$2[aby]\$/.test(r.raw));
await buyer2.login(b2.email, "ClaveSegura2026");
await seller.login("sel_nico@t.cl"); await storeSeller.login("sel_sipo@t.cl"); await other.login("sel_lore@t.cl").then((x) => x.status === 200 ? x : other.login("sel_nico@t.cl")); await admin.login("admin@test.cl");

console.log("\n== El token no aparece en ninguna página ni respuesta ==");
// En `next dev`, React agrega al HTML información de depuración con los valores leídos en el servidor (cookies incluidas).
// Eso no existe en producción: allí es donde esta revisión tiene sentido.
const devMode = /\/_next\/static\/chunks\/webpack\.js/.test((await anon.req("/")).raw);
if (devMode) console.log("  AVISO  servidor en modo desarrollo: la revisión del token en el HTML se omite (córrela contra next build + next start)");
const pages = [[buyer, ["/", "/cartas", "/carrito", "/checkout", "/cuenta", "/cuenta/soporte", "/ayuda"]], [storeSeller, ["/panel", "/panel/ordenes", "/panel/tienda", "/panel/perfil", "/panel/publicar"]], [admin, ["/panel/usuarios", "/panel/mercado", "/panel/analitica", "/panel/auditoria"]]];
const scripts = new Set();
for (const [client, list] of pages) for (const path of list) {
  r = await client.req(path);
  const html = r.raw;
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) scripts.add(m[1]);
  if (!devMode) check(`${path}: sin token de sesión`, !html.includes(client.token) && !/eyJhbGciOi[\w-]+\.[\w-]+\.[\w-]+/.test(html), r.status);
  check(`${path}: sin secretos del servidor`, leaks(html).length === 0, leaks(html).join(","));
  check(`${path}: sin hashes de claves`, !/\$2[aby]\$\d\d\$/.test(html));
}
for (const [client, path] of [[buyer, "/api/panel/counts"], [storeSeller, "/api/panel/counts"], [storeSeller, "/api/seller/coupons"], [buyer, "/api/support/tickets"], [admin, "/api/admin/analytics"]]) {
  r = await client.req(path);
  check(`${path}: la API no devuelve tokens, hashes ni secretos`, !r.raw.includes(client.token) && !/\$2[aby]\$\d\d\$/.test(r.raw) && leaks(r.raw).length === 0, r.status);
}
r = await buyer.req("/api/account/export");
check("la descarga de mis datos no incluye el hash de la clave ni el secreto 2FA", r.status === 200 && !/\$2[aby]\$\d\d\$/.test(r.raw) && !/totpSecret"\s*:\s*"[A-Z2-7]{16,}/.test(r.raw), r.status);

console.log("\n== El JavaScript que recibe el navegador no trae secretos ==");
let scanned = 0, jsLeaks = [];
for (const src of scripts) {
  const js = await (await fetch(new URL(src, BASE))).text();
  scanned++;
  jsLeaks.push(...leaks(js).map((k) => `${k} en ${src}`));
  if (/postgres(ql)?:\/\/[^"'\s]+:[^"'\s]+@/.test(js)) jsLeaks.push(`cadena de conexión en ${src}`);
}
check(`se revisaron los archivos JavaScript públicos (${scanned})`, scanned >= 5, scanned);
check("ningún archivo JavaScript contiene secretos ni la base de datos", jsLeaks.length === 0, jsLeaks.join("; "));
const clientCode = fs.readdirSync("src", { recursive: true }).filter((f) => /\.(tsx?|mjs)$/.test(f)).map((f) => fs.readFileSync(`src/${f}`, "utf8")).filter((s) => s.startsWith('"use client"'));
check("ningún componente del navegador guarda tokens en localStorage/sessionStorage", !clientCode.some((s) => /(local|session)Storage\.setItem\([^)]*(token|session_|jwt|auth)/i.test(s)));
check("ningún componente del navegador usa variables privadas del servidor", !clientCode.some((s) => /process\.env\.(?!NEXT_PUBLIC_|NODE_ENV)/.test(s)));

console.log("\n== Sin sesión no se compra ni se publica ==");
const [L] = (await db.query(`SELECT l.id FROM "Listing" l JOIN "User" u ON u.id=l."sellerId" WHERE u.email='sel_sipo@t.cl' AND l.status='ACTIVE' AND l.stock>2 LIMIT 1`)).rows;
const cart = { items: [{ listingId: L.id, quantity: 1 }], shipMethod: "PICKUP", paymentMethod: "TRANSFER", acceptTerms: true, idempotencyKey: crypto.randomUUID(), expectedTotal: 1 };
r = await anon.req("/api/checkout", { method: "POST", json: cart });
check("un visitante NO puede comprar (401)", r.status === 401, r.status);
r = await anon.req("/api/listings", { method: "POST", json: { type: "SINGLE", game: "pokemon", title: "Anónimo", price: 1000 } });
check("un visitante NO puede publicar (401)", r.status === 401, r.status);
r = await anon.req("/api/listings/bulk", { method: "POST", json: { items: [] } });
check("un visitante NO puede publicar en lote (401)", r.status === 401, r.status);
r = await anon.req("/api/uploads", { method: "POST", json: {} });
check("un visitante NO puede subir archivos", r.status === 401 || r.status === 400, r.status);
r = await anon.req(`/api/listings/${L.id}`, { method: "PATCH", json: { price: 1 } });
check("un visitante NO puede editar publicaciones (401)", r.status === 401, r.status);
r = await anon.req(`/api/listings/${L.id}`, { method: "DELETE" });
check("un visitante NO puede borrar publicaciones (401)", r.status === 401, r.status);
for (const path of ["/checkout", "/cuenta", "/panel", "/panel/publicar"]) {
  r = await anon.req(path);
  check(`un visitante en ${path} va a ingresar`, r.status === 307 && (r.location ?? "").includes("/ingresar"), `${r.status} ${r.location}`);
}

console.log("\n== Comprador: compra, pero no publica ==");
r = await buyer.req("/api/checkout", { method: "POST", json: { items: cart.items, shipMethod: "PICKUP", paymentMethod: "TRANSFER" } });
check("un comprador con sesión SÍ puede comprar (200)", r.status === 200, JSON.stringify(r.data));
const orderId = r.data?.orders?.[0]?.orderId;
r = await buyer.req("/api/listings", { method: "POST", json: { type: "SINGLE", game: "pokemon", title: "Comprador publica", price: 1000 } });
check("un comprador NO puede publicar (403)", r.status === 403, r.status);
r = await buyer.req("/api/listings/bulk", { method: "POST", json: { items: [] } });
check("un comprador NO puede publicar en lote (403)", r.status === 403, r.status);
r = await buyer.req("/api/seller/coupons", { method: "POST", json: { code: "HACK", type: "PERCENT", value: 100 } });
check("un comprador NO puede crear cupones (403)", r.status === 403, r.status);

console.log("\n== Vendedores y tiendas publican ==");
r = await seller.req("/api/listings", { method: "POST", json: { type: "SINGLE", game: "magic", title: `Seguridad vendedor ${Date.now()}`, price: 2500, stock: 1 } });
check("un vendedor SÍ puede publicar (201)", r.status === 201, JSON.stringify(r.data));
const ownListing = r.data?.listing?.id;
r = await storeSeller.req("/api/listings", { method: "POST", json: { type: "SEALED", game: "pokemon", title: `Seguridad tienda ${Date.now()}`, price: 45000, stock: 2 } });
check("una tienda SÍ puede publicar (201)", r.status === 201, JSON.stringify(r.data));
r = await storeSeller.req(`/api/listings/${ownListing}`, { method: "PATCH", json: { price: 1 } });
check("una tienda NO puede editar la publicación de otro vendedor", r.status === 403 || r.status === 404, r.status);
r = await storeSeller.req(`/api/listings/${ownListing}`, { method: "DELETE" });
check("una tienda NO puede borrar la publicación de otro vendedor", r.status === 403 || r.status === 404, r.status);
r = await seller.req("/api/listings", { method: "POST", json: { type: "SINGLE", game: "magic", title: "Suplantación", price: 1000, sellerId: (await db.query(`SELECT id FROM "User" WHERE email='sel_sipo@t.cl'`)).rows[0].id } });
const [spoof] = (await db.query(`SELECT u.email FROM "Listing" l JOIN "User" u ON u.id=l."sellerId" WHERE l.title='Suplantación' ORDER BY l."createdAt" DESC LIMIT 1`)).rows;
check("un vendedor NO puede publicar a nombre de otro", !spoof || spoof.email === "sel_nico@t.cl", spoof?.email);
r = await seller.req("/api/listings", { method: "POST", json: { type: "SINGLE", game: "magic", title: "Destacado gratis", price: 1000, featured: true } });
const [feat] = (await db.query(`SELECT featured FROM "Listing" WHERE title='Destacado gratis' ORDER BY "createdAt" DESC LIMIT 1`)).rows;
check("un vendedor NO puede marcarse como destacado (solo el admin)", !feat?.featured, JSON.stringify(feat));

console.log("\n== Nadie ve datos ajenos ==");
r = await buyer2.req(`/api/orders/${orderId}/messages`);
check("otro comprador NO lee el chat de mi orden", r.status === 403 || r.status === 404, r.status);
r = await buyer2.req(`/api/orders/${orderId}/receipt`);
check("otro comprador NO ve mi comprobante", r.status === 403 || r.status === 404, r.status);
r = await seller.req(`/api/orders/${orderId}/status`, { method: "PATCH", json: { status: "PAID" } });
check("un vendedor NO confirma pagos de órdenes ajenas", r.status === 403 || r.status === 404, r.status);
r = await buyer2.req("/cuenta");
check("Mi cuenta no muestra órdenes de otro comprador", r.status === 200 && !r.raw.includes(orderId));
r = await anon.req("/vendedor/sipo-tcg");
check("el perfil público no muestra datos bancarios", r.status === 200 && !r.raw.includes("123456789") && !r.raw.includes("11.111.111-1"));
for (const [client, path, method] of [[buyer, "/api/admin/analytics", "GET"], [storeSeller, "/api/admin/analytics", "GET"], [storeSeller, "/api/admin/settings", "GET"], [buyer, "/api/users", "POST"], [storeSeller, "/api/users", "POST"]]) {
  r = await client.req(path, { method, json: method === "POST" ? { name: "x", email: "x@x.cl", password: "Clave1234567!" } : undefined });
  check(`${path} (${method}) está cerrado para no administradores`, r.status === 401 || r.status === 403 || r.status === 405, r.status);
}

console.log("\n== Tokens falsificados ==");
const [buyerRow] = (await db.query(`SELECT id, email, name FROM "User" WHERE email=$1`, [b1.email])).rows;
const forge = async (secret, claims) => new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setIssuer("dreamdeck-tcg").setAudience("dreamdeck-tcg").setExpirationTime("1h").sign(new TextEncoder().encode(secret));
const fake = new C();
fake.cookie = `dreamdeck_session=${await forge("una-clave-inventada-por-un-atacante-123456", { sub: buyerRow.id, email: buyerRow.email, name: "x", role: "ADMIN" })}`;
r = await fake.req("/panel/usuarios");
check("un token firmado con otra clave NO sirve", r.status === 307 && (r.location ?? "").includes("/ingresar"), `${r.status} ${r.location}`);
const [h, p] = buyer.token.split(".");
const payload = JSON.parse(Buffer.from(p, "base64url").toString());
fake.cookie = `dreamdeck_session=${h}.${Buffer.from(JSON.stringify({ ...payload, role: "ADMIN" })).toString("base64url")}.${buyer.token.split(".")[2]}`;
r = await fake.req("/api/admin/analytics");
check("cambiar el rol dentro del token lo invalida", r.status === 401 || r.status === 403, r.status);
fake.cookie = `dreamdeck_session=${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ ...payload, role: "ADMIN" })).toString("base64url")}.`;
r = await fake.req("/api/admin/analytics");
check("un token sin firma (alg none) NO sirve", r.status === 401 || r.status === 403, r.status);
if (env.AUTH_SECRET) {
  fake.cookie = `dreamdeck_session=${await forge(env.AUTH_SECRET, { sub: buyerRow.id, email: buyerRow.email, name: "x", role: "ADMIN", tv: 0 })}`;
  r = await fake.req("/panel/usuarios");
  check("aunque el token diga ADMIN, el rol se lee de la base de datos", r.status === 307, `${r.status} ${r.location}`);
}

console.log("\n== Cerrar sesión ==");
const leaver = new C();
await leaver.login(b2.email, "ClaveSegura2026");
const stolen = leaver.cookie;
r = await leaver.req("/api/account/sessions", { method: "DELETE" });
check("cerrar todas las sesiones (200)", r.status === 200, r.status);
const thief = new C(); thief.cookie = stolen;
r = await thief.req("/cuenta");
check("un token robado deja de servir después de cerrar todas las sesiones", r.status === 307, r.status);
const out = new C(); await out.login(b2.email, "ClaveSegura2026");
r = await out.req("/api/auth/logout", { method: "POST" });
check("cerrar sesión borra la cookie", out.setCookies.some((c) => /^dreamdeck_session=;|^dreamdeck_session=.*(Max-Age=0|Expires=Thu, 01 Jan 1970)/i.test(c)), out.setCookies.join(" | ").replace(/=[^;]{20,}/g, "=***"));

console.log("\n== Ataques desde otro sitio y fuerza bruta ==");
r = await buyer.req("/api/listings", { method: "POST", json: { type: "SINGLE", game: "pokemon", title: "CSRF", price: 1 }, headers: { origin: "https://sitio-malicioso.example" } });
check("una petición desde otro sitio se bloquea (403)", r.status === 403, r.status);
r = await anon.req("/");
for (const [name, value] of [["content-security-policy", /frame-ancestors 'none'/], ["x-frame-options", /DENY/], ["x-content-type-options", /nosniff/], ["strict-transport-security", /max-age=\d+/], ["referrer-policy", /strict-origin/]]) {
  check(`cabecera ${name}`, value.test(r.headers.get(name) ?? ""), r.headers.get(name));
}
check("no se anuncia la tecnología del servidor (x-powered-by)", !r.headers.get("x-powered-by"));
// Zonas con sesión y pagos: nonce estricto. Páginas públicas: sin nonce (así se sirven desde caché) pero solo scripts propios.
const publicSrc = (r.headers.get("content-security-policy") ?? "").match(/script-src ([^;]*)/)?.[1] ?? "";
check("páginas públicas: scripts solo de este sitio (sin dominios externos ni comodines)", /^'self'( 'unsafe-inline')?$/.test(publicSrc.trim()), publicSrc);
const login = await anon.req("/ingresar");
const scriptSrc = (login.headers.get("content-security-policy") ?? "").match(/script-src ([^;]*)/)?.[1] ?? "";
const nonce = scriptSrc.match(/'nonce-([^']+)'/)?.[1];
check("login y panel: la política de scripts usa nonce y no permite scripts inyectados ('unsafe-inline')", !!nonce && !scriptSrc.includes("'unsafe-inline'"), scriptSrc);
const execScripts = [...login.raw.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>/g)].map((m) => m[0]);
check(`todos los scripts de la página llevan el nonce (${execScripts.length})`, execScripts.length > 0 && execScripts.every((tag) => tag.includes(`nonce="${nonce}"`)), execScripts.find((tag) => !tag.includes(`nonce="${nonce}"`)));
const second = await anon.req("/ingresar");
check("el nonce cambia en cada visita", !!nonce && !(second.headers.get("content-security-policy") ?? "").includes(nonce));
await db.query(`DELETE FROM "LoginAttempt"`);
let last;
for (let i = 0; i < 12; i++) last = await anon.req("/api/auth/login", { method: "POST", json: { email: b1.email, password: `Incorrecta${i}!!` } });
check("muchos intentos de clave se bloquean (429)", last.status === 429, last.status);
await db.query(`DELETE FROM "LoginAttempt"`);
// Antes, una ventana corta (cotizador: 60 s) borraba los intentos de todas las claves de más de 4 minutos.
for (let i = 0; i < 6; i++) await db.query(`INSERT INTO "LoginAttempt"(id, key, "createdAt") VALUES ($1, 'prueba:login-largo', now() - interval '10 minutes')`, [`seg${Date.now()}${i}`]);
await buyer.req("/api/checkout/quote", { method: "POST", json: { items: cart.items, shipMethod: "PICKUP", paymentMethod: "TRANSFER" } });
const [kept] = (await db.query(`SELECT count(*)::int n FROM "LoginAttempt" WHERE key='prueba:login-largo'`)).rows;
check("un límite corto no borra los intentos de otros límites (login de 15 min)", kept.n === 6, kept.n);
await db.query(`DELETE FROM "LoginAttempt"`);
r = await anon.req("/api/auth/login", { method: "POST", json: { email: "no-existe@nada.cl", password: "Cualquiera123!" } });
const r2 = await anon.req("/api/auth/login", { method: "POST", json: { email: b1.email, password: "Cualquiera123!" } });
check("el login no revela si un correo existe", r.status === r2.status && JSON.stringify(r.data) === JSON.stringify(r2.data), `${JSON.stringify(r.data)} vs ${JSON.stringify(r2.data)}`);

await db.query(`DELETE FROM "Listing" WHERE title IN ('Suplantación','Destacado gratis') OR title LIKE 'Seguridad %'`).catch(() => {});
await db.query(`DELETE FROM "LoginAttempt"`);
await db.end();
console.log(`\nRESULTADO: ${passed} OK, ${failed} fallas`);
process.exit(failed ? 1 : 0);
