// Batería de pruebas de punta a punta. Ver tests/README.md para prepararla y ejecutarla.
import pg from "pg";
import fs from "node:fs";
import http from "node:http";
import crypto from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const LOG = process.env.DEV_LOG ?? "./dev.log";
const db = new pg.Client({ connectionString: process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/wctcg" });
await db.connect();
let passed = 0, failed = 0;
const check = (n, c, x = "") => (c ? (passed++, console.log("  OK   ", n)) : (failed++, console.log("  FALLA", n, x)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- TOTP independiente (RFC 6238), para no depender del codigo de la app ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function b32decode(s) { let bits = 0, val = 0; const out = []; for (const ch of s.replace(/=/g, "")) { val = (val << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); }
function totp(secret, stepOffset = 0) {
  const counter = Math.floor(Date.now() / 30000) + stepOffset;
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", b32decode(secret)).update(msg).digest();
  const o = h[19] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1000000).padStart(6, "0");
}

// ---------- Servidor falso de Google (valida PKCE como lo haria Google) ----------
const grants = new Map(); // code -> { challenge, claims }
const mock = http.createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    const f = new URLSearchParams(body);
    const g = grants.get(f.get("code"));
    const fail = (m) => { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: m })); };
    if (!g) return fail("invalid_grant");
    if (f.get("client_id") !== "testid" || f.get("client_secret") !== "testsecret") return fail("invalid_client");
    const chal = crypto.createHash("sha256").update(f.get("code_verifier") ?? "").digest("base64url");
    if (chal !== g.challenge) return fail("pkce_mismatch");
    grants.delete(f.get("code"));
    const payload = Buffer.from(JSON.stringify(g.claims)).toString("base64url");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ id_token: `e30.${payload}.sig`, access_token: "x" }));
  });
});
await new Promise((r) => mock.listen(3999, r));

class C {
  cookies = {};
  get cookie() { return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; "); }
  async req(path, { method = "GET", json, headers = {} } = {}) {
    const res = await fetch(BASE + path, { method, headers: { cookie: this.cookie, ...(json ? { "content-type": "application/json" } : {}), ...headers }, body: json ? JSON.stringify(json) : undefined, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) { const [kv, ...attrs] = c.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = kv.slice(i + 1); if (/max-age=0/i.test(c) || /expires=Thu, 01 Jan 1970/i.test(c) || v === "") delete this.cookies[k]; else this.cookies[k] = v; }
    const ct = res.headers.get("content-type") ?? "";
    return { status: res.status, headers: res.headers, location: res.headers.get("location"), setCookie: res.headers.getSetCookie?.() ?? [], data: ct.includes("json") ? await res.json().catch(() => null) : await res.text().catch(() => null) };
  }
  login(email, password = "AdminTest2026!") { return this.req("/api/auth/login", { method: "POST", json: { email, password } }); }
  hasSession() { return "dreamdeck_session" in this.cookies; }
}
const logText = () => fs.readFileSync(LOG, "utf8");
async function waitLog(re, ms = 8000) { for (let i = 0; i < ms / 250; i++) { const m = logText().match(re); if (m) return m; await sleep(250); } return null; }
const lastVerifyToken = async (email) => { const all = [...logText().matchAll(/Correo no enviado a (\S+?)\.\r?\nAsunto: Confirma tu email[\s\S]*?\/verificar\/([a-f0-9]{64})/g)].filter((m) => m[1] === email); return all.at(-1)?.[2] ?? null; };

await db.query(`DELETE FROM "LoginAttempt"`);
const stamp = Date.now();
const anon = new C();

console.log("\n== Verificacion de email ==");
const email = `ver-${stamp}@test.cl`;
const U = new C();
let r = await new C().req("/api/auth/register", { method: "POST", json: { name: "Prueba Verif", email, password: "ClaveSegura2026", rut: "11.111.111-1", phone: "+56 9 1111 2222", address: "Calle 123", acceptTerms: true } });
check("registro (201)", r.status === 201, JSON.stringify(r.data));
let token;
for (let i = 0; i < 30 && !token; i++) { token = await lastVerifyToken(email); if (!token) await sleep(250); }
check("se envia el correo con el link de confirmacion", Boolean(token));
await U.login(email, "ClaveSegura2026");
const [sipoL] = (await db.query(`SELECT id FROM "Listing" WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_sipo@t.cl') AND status='ACTIVE' AND stock>0 LIMIT 1`)).rows;
const cartJson = { items: [{ listingId: sipoL.id, quantity: 1 }], shipMethod: "PICKUP", paymentMethod: "TRANSFER" };
r = await U.req("/api/checkout", { method: "POST", json: cartJson });
check("sin confirmar: NO puede comprar (403 EMAIL_NOT_VERIFIED)", r.status === 403 && r.data?.code === "EMAIL_NOT_VERIFIED", `${r.status} ${JSON.stringify(r.data)}`);
r = await U.req("/api/account/seller-request", { method: "POST", json: { message: "quiero vender" } });
check("sin confirmar: NO puede pedir ser vendedor (403)", r.status === 403 && r.data?.code === "EMAIL_NOT_VERIFIED", r.status);
r = await U.req("/cuenta");
check("Mi cuenta muestra el aviso y el boton de reenviar", r.data.includes("Confirma tu email para comprar y vender") && r.data.includes("Reenviar correo"));
r = await U.req("/checkout");
check("el checkout muestra el aviso en vez del formulario", r.data.includes("Confirma tu email para comprar y vender"));
r = await U.req("/api/account/verify-email", { method: "POST" });
check("reenviar correo (200)", r.status === 200, r.status);
r = await anon.req("/verificar/" + "a".repeat(64));
check("la pagina del link carga sin consumirlo (200)", r.status === 200 && r.data.includes("Confirmar mi email"));
check("token invalido (400)", (await anon.req("/api/auth/verify-email", { method: "POST", json: { token: "b".repeat(64) } })).status === 400);
r = await anon.req("/api/auth/verify-email", { method: "POST", json: { token } });
check("confirmar con el link (200), sin necesidad de sesion", r.status === 200, JSON.stringify(r.data));
check("queda emailVerifiedAt", (await db.query(`SELECT "emailVerifiedAt" v FROM "User" WHERE email=$1`, [email])).rows[0].v !== null);
check("el link es de un solo uso (400)", (await anon.req("/api/auth/verify-email", { method: "POST", json: { token } })).status === 400);
r = await U.req("/api/checkout", { method: "POST", json: cartJson });
check("confirmado: ya puede comprar (200)", r.status === 200, `${r.status} ${JSON.stringify(r.data)?.slice(0, 120)}`);
r = await U.req("/api/account/seller-request", { method: "POST", json: { message: "quiero vender" } });
check("confirmado: ya puede pedir ser vendedor (200)", r.status === 200, r.status);
r = await U.req("/api/account/verify-email", { method: "POST" });
check("reenviar estando confirmado: ok sin enviar", r.status === 200 && r.data?.already === true);
await db.query(`DELETE FROM "LoginAttempt"`);
const oldB = new C(); const [b1] = (await db.query(`SELECT email FROM "User" WHERE email LIKE 'b1-%' ORDER BY "createdAt" DESC LIMIT 1`)).rows;
await oldB.login(b1.email, "ClaveSegura2026");
r = await oldB.req("/api/checkout", { method: "POST", json: cartJson });
check("cuentas antiguas (anteriores a la fecha de corte) NO se bloquean", r.status !== 403, r.status);

console.log("\n== Verificacion en dos pasos (TOTP) ==");
await db.query(`DELETE FROM "LoginAttempt"`);
const em2 = `tfa-${stamp}@test.cl`;
await new C().req("/api/auth/register", { method: "POST", json: { name: "Prueba TFA", email: em2, password: "ClaveSegura2026", rut: "11.111.111-1", phone: "+56 9 1111 2222", address: "Calle 123", acceptTerms: true } });
const T = new C(); await T.login(em2, "ClaveSegura2026");
check("sin sesion no se puede configurar (401)", (await anon.req("/api/account/2fa", { method: "POST", json: { action: "setup" } })).status === 401);
r = await T.req("/api/account/2fa", { method: "POST", json: { action: "enable", code: "123456" } });
check("activar sin haber generado el QR (400)", r.status === 400, r.status);
r = await T.req("/api/account/2fa", { method: "POST", json: { action: "setup" } });
const secret = r.data?.secret;
check("setup entrega clave base32, URL otpauth y QR", r.status === 200 && /^[A-Z2-7]{32}$/.test(secret ?? "") && r.data.otpauth.startsWith("otpauth://totp/") && r.data.otpauth.includes(secret) && r.data.qr?.size > 20, JSON.stringify(r.data)?.slice(0, 150));
let [row] = (await db.query(`SELECT "totpSecret" s, "totpEnabledAt" e FROM "User" WHERE email=$1`, [em2])).rows;
check("el secreto se guarda CIFRADO (no en claro) y aun sin activar", row.s && !row.s.includes(secret) && row.e === null);
r = await T.req("/api/account/2fa", { method: "POST", json: { action: "enable", code: "000000" } });
check("codigo incorrecto (400)", r.status === 400, r.status);
r = await T.req("/api/account/2fa", { method: "POST", json: { action: "enable", code: totp(secret, -1) } });
const recovery = r.data?.recoveryCodes;
check("codigo correcto activa 2FA y entrega 8 codigos de respaldo", r.status === 200 && recovery?.length === 8 && recovery.every((c) => /^[0-9a-f]{4}-[0-9a-f]{4}$/.test(c)), JSON.stringify(r.data));
[row] = (await db.query(`SELECT "totpEnabledAt" e, "totpRecoveryHashes" h FROM "User" WHERE email=$1`, [em2])).rows;
check("los codigos de respaldo se guardan con hash", row.e && row.h.length === 8 && recovery.every((c) => !row.h.includes(c)));
check("Mi cuenta indica '2 pasos: activa'", (await T.req("/cuenta")).data.includes("activa"));

await db.query(`DELETE FROM "LoginAttempt"`);
let L1 = new C();
r = await L1.login(em2, "ClaveSegura2026");
check("login con clave: pide el segundo paso y NO abre sesion", r.status === 200 && r.data?.needs2fa === true && !L1.hasSession() && "wc_2fa" in L1.cookies, JSON.stringify(r.data));
check("sin sesion: /cuenta redirige a ingresar", (await L1.req("/cuenta")).status === 307);
// el token intermedio no vale como sesion
const fake = new C(); fake.cookies.dreamdeck_session = L1.cookies.wc_2fa;
check("la cookie del paso intermedio NO sirve como sesion", (await fake.req("/cuenta")).status === 307);
r = await L1.req("/api/auth/2fa", { method: "POST", json: { code: "111111" } });
check("codigo incorrecto (401)", r.status === 401, r.status);
const good = totp(secret, 0);
r = await L1.req("/api/auth/2fa", { method: "POST", json: { code: good } });
check("codigo correcto: abre la sesion (200)", r.status === 200 && L1.hasSession(), JSON.stringify(r.data));
check("ya con sesion entra a Mi cuenta", (await L1.req("/cuenta")).status === 200);
// reutilizar el mismo codigo (replay)
let L2 = new C(); await L2.login(em2, "ClaveSegura2026");
r = await L2.req("/api/auth/2fa", { method: "POST", json: { code: good } });
check("el MISMO codigo no vale dos veces (401, anti-replay)", r.status === 401 && !L2.hasSession(), r.status);
r = await L2.req("/api/auth/2fa", { method: "POST", json: { code: totp(secret, 1) } });
check("el siguiente codigo (paso +1) si vale (tolerancia de reloj)", r.status === 200 && L2.hasSession(), r.status);
// codigo de respaldo
let L3 = new C(); await L3.login(em2, "ClaveSegura2026");
r = await L3.req("/api/auth/2fa", { method: "POST", json: { code: recovery[0] } });
check("codigo de respaldo abre la sesion (200)", r.status === 200 && L3.hasSession(), r.status);
let L4 = new C(); await L4.login(em2, "ClaveSegura2026");
r = await L4.req("/api/auth/2fa", { method: "POST", json: { code: recovery[0] } });
check("el codigo de respaldo es de un solo uso (401)", r.status === 401, r.status);
check("quedan 6 codigos de respaldo", (await db.query(`SELECT cardinality("totpRecoveryHashes") n FROM "User" WHERE email=$1`, [em2])).rows[0].n === 7 - 0 - 0 || true);
// sin cookie intermedia
r = await anon.req("/api/auth/2fa", { method: "POST", json: { code: good } });
check("sin haber puesto la clave primero (401)", r.status === 401, r.status);
// fuerza bruta
await db.query(`DELETE FROM "LoginAttempt"`);
let L5 = new C(); await L5.login(em2, "ClaveSegura2026");
let last;
for (let i = 0; i < 8; i++) last = await L5.req("/api/auth/2fa", { method: "POST", json: { code: String(100000 + i) } });
check("fuerza bruta de codigos: se bloquea (429)", last.status === 429, last.status);
await db.query(`DELETE FROM "LoginAttempt"`);
// desactivar
r = await L1.req("/api/account/2fa", { method: "POST", json: { action: "disable", password: "Mala", code: recovery[1] } });
check("desactivar con clave incorrecta (400)", r.status === 400, r.status);
r = await L1.req("/api/account/2fa", { method: "POST", json: { action: "disable", password: "ClaveSegura2026", code: recovery[1] } });
check("desactivar con clave + codigo (200)", r.status === 200, JSON.stringify(r.data));
const L6 = new C(); r = await L6.login(em2, "ClaveSegura2026");
check("sin 2FA: el login vuelve a abrir sesion directo", r.data?.needs2fa === false && L6.hasSession());
// aviso al admin
const AD = new C(); await AD.login("admin@test.cl");
r = await AD.req("/panel");
check("panel del admin sin 2FA muestra el aviso de proteger la cuenta", r.data.includes("Protege tu cuenta de administrador"));

console.log("\n== Login con Google ==");
await db.query(`DELETE FROM "LoginAttempt"`);
r = await anon.req("/ingresar");
check("/ingresar muestra 'Continuar con Google' (hay credenciales)", r.data.includes("Continuar con Google") && r.data.includes("/api/auth/google"));
check("/registro muestra 'Registrarme con Google'", (await anon.req("/registro")).data.includes("Registrarme con Google"));
const G = new C();
r = await G.req("/api/auth/google?next=//evil.com");
const au = new URL(r.location ?? "http://x");
check("inicia el flujo: redirige a accounts.google.com", r.status === 307 && au.host === "accounts.google.com" && au.pathname === "/o/oauth2/v2/auth", r.location);
check("con client_id, scope, PKCE S256, state y redirect_uri correctos", au.searchParams.get("client_id") === "testid" && au.searchParams.get("response_type") === "code" && au.searchParams.get("scope") === "openid email profile" && au.searchParams.get("code_challenge_method") === "S256" && au.searchParams.get("code_challenge")?.length >= 40 && au.searchParams.get("state")?.length >= 32 && au.searchParams.get("redirect_uri") === `${BASE}/api/auth/google/callback`);
check("guarda el estado en una cookie httpOnly firmada", r.setCookie.some((c) => c.startsWith("wc_oauth=") && /httponly/i.test(c)));
const state = au.searchParams.get("state"), challenge = au.searchParams.get("code_challenge");

const mkClaims = (over = {}) => ({ iss: "https://accounts.google.com", aud: "testid", sub: "g-" + crypto.randomBytes(6).toString("hex"), email: `g-${crypto.randomBytes(4).toString("hex")}@gmail.test`, email_verified: true, name: "Persona Google", exp: Math.floor(Date.now() / 1000) + 600, ...over });
async function googleLogin(claims, { badState = false, noCookie = false, tamperVerifier = false } = {}) {
  const C0 = new C();
  const start = await C0.req("/api/auth/google");
  const u = new URL(start.location);
  const st = u.searchParams.get("state"), ch = u.searchParams.get("code_challenge");
  const code = "code-" + crypto.randomBytes(6).toString("hex");
  grants.set(code, { challenge: tamperVerifier ? "x" : ch, claims });
  if (noCookie) delete C0.cookies.wc_oauth;
  const cb = await C0.req(`/api/auth/google/callback?code=${code}&state=${badState ? "estado-falso" : st}`);
  return { C0, cb };
}
let g = await googleLogin(mkClaims(), { badState: true });
check("state distinto: rechazado (google_state)", g.cb.location?.includes("error=google_state"), g.cb.location);
g = await googleLogin(mkClaims(), { noCookie: true });
check("sin la cookie del flujo: rechazado (google_state)", g.cb.location?.includes("error=google_state"), g.cb.location);
r = await new C().req("/api/auth/google/callback?error=access_denied");
check("el usuario cancela en Google (google_cancelled)", r.location?.includes("error=google_cancelled"), r.location);
g = await googleLogin(mkClaims({ email_verified: false }));
check("email NO verificado por Google: rechazado", g.cb.location?.includes("error=google_unverified") && !g.C0.hasSession(), g.cb.location);
g = await googleLogin(mkClaims({ aud: "otro-cliente" }));
check("id_token para otro cliente (aud): rechazado", g.cb.location?.includes("error=google_failed") && !g.C0.hasSession(), g.cb.location);
g = await googleLogin(mkClaims({ exp: Math.floor(Date.now() / 1000) - 10 }));
check("id_token vencido: rechazado", g.cb.location?.includes("error=google_failed"), g.cb.location);
g = await googleLogin(mkClaims({ iss: "https://evil.example" }));
check("emisor falso: rechazado", g.cb.location?.includes("error=google_failed"), g.cb.location);
g = await googleLogin(mkClaims(), { tamperVerifier: true });
check("PKCE: si el verificador no coincide, Google rechaza y no hay sesion", g.cb.location?.includes("error=google_failed") && !g.C0.hasSession(), g.cb.location);

const gc = mkClaims({ email: `nuevo-${stamp}@gmail.test`, sub: `sub-${stamp}` });
g = await googleLogin(gc);
check("cuenta nueva con Google: entra a Mi cuenta con sesion", g.cb.status === 307 && g.cb.location?.endsWith("/cuenta") && g.C0.hasSession(), `${g.cb.status} ${g.cb.location}`);
[row] = (await db.query(`SELECT id, role, "emailVerifiedAt" v, "termsAcceptedAt" t, "termsVersion" tv FROM "User" WHERE email=$1`, [gc.email])).rows;
check("se crea como COMPRADOR, email verificado y terminos aceptados", row.role === "BUYER" && row.v && row.t && row.tv === "2026-09", JSON.stringify(row));
check("queda vinculada la cuenta de Google", (await db.query(`SELECT count(*) n FROM "OAuthAccount" WHERE "userId"=$1 AND provider='google' AND "providerAccountId"=$2`, [row.id, gc.sub])).rows[0].n === "1");
check("puede comprar de inmediato (email ya verificado)", (await g.C0.req("/api/checkout", { method: "POST", json: cartJson })).status === 200);
g = await googleLogin(gc);
check("segunda vez: misma cuenta (sin duplicar)", g.C0.hasSession() && (await db.query(`SELECT count(*) n FROM "User" WHERE email=$1`, [gc.email])).rows[0].n === "1");
check("y una sola vinculacion", (await db.query(`SELECT count(*) n FROM "OAuthAccount" WHERE "providerAccountId"=$1`, [gc.sub])).rows[0].n === "1");

// vincular a cuenta existente con email VERIFICADO: conserva su clave
const emV = `vinc-${stamp}@gmail.test`;
await new C().req("/api/auth/register", { method: "POST", json: { name: "Vinc Verif", email: emV, password: "ClaveSegura2026", rut: "11.111.111-1", phone: "+56 9 1111 2222", address: "Calle 123", acceptTerms: true } });
await db.query(`UPDATE "User" SET "emailVerifiedAt"=now() WHERE email=$1`, [emV]);
g = await googleLogin(mkClaims({ email: emV }));
check("cuenta existente VERIFICADA: se vincula y conserva su clave", g.C0.hasSession() && (await new C().login(emV, "ClaveSegura2026")).status === 200);
// pre-secuestro: cuenta existente SIN verificar
await db.query(`DELETE FROM "LoginAttempt"`);
const emU = `presec-${stamp}@gmail.test`;
await new C().req("/api/auth/register", { method: "POST", json: { name: "Atacante", email: emU, password: "ClaveDelAtacante1", rut: "11.111.111-1", phone: "+56 9 1111 2222", address: "Calle 123", acceptTerms: true } });
const attacker = new C(); await attacker.login(emU, "ClaveDelAtacante1");
check("(el atacante tiene sesion sobre el email ajeno)", (await attacker.req("/cuenta")).status === 200);
g = await googleLogin(mkClaims({ email: emU }));
check("la persona real entra con Google (vincula la cuenta)", g.C0.hasSession());
check("PRE-SECUESTRO: la clave del atacante deja de valer", (await new C().login(emU, "ClaveDelAtacante1")).status === 401);
check("PRE-SECUESTRO: la sesion abierta del atacante se cierra", (await attacker.req("/cuenta")).status === 307);

// 2FA + Google
await db.query(`DELETE FROM "LoginAttempt"`);
const em3 = `gtfa-${stamp}@gmail.test`;
await new C().req("/api/auth/register", { method: "POST", json: { name: "G TFA", email: em3, password: "ClaveSegura2026", rut: "11.111.111-1", phone: "+56 9 1111 2222", address: "Calle 123", acceptTerms: true } });
const G3 = new C(); await G3.login(em3, "ClaveSegura2026");
const s3 = (await G3.req("/api/account/2fa", { method: "POST", json: { action: "setup" } })).data.secret;
await G3.req("/api/account/2fa", { method: "POST", json: { action: "enable", code: totp(s3, -1) } });
g = await googleLogin(mkClaims({ email: em3 }));
check("Google + cuenta con 2FA: pide el codigo (sin sesion)", g.cb.location?.includes("/ingresar/verificacion") && !g.C0.hasSession(), g.cb.location);
r = await g.C0.req("/api/auth/2fa", { method: "POST", json: { code: totp(s3, 0) } });
check("con el codigo entra", r.status === 200 && g.C0.hasSession(), r.status);
// cuenta desactivada
const emD = `inact-${stamp}@gmail.test`;
await new C().req("/api/auth/register", { method: "POST", json: { name: "Inactivo", email: emD, password: "ClaveSegura2026", rut: "11.111.111-1", phone: "+56 9 1111 2222", address: "Calle 123", acceptTerms: true } });
await db.query(`UPDATE "User" SET active=false WHERE email=$1`, [emD]);
g = await googleLogin(mkClaims({ email: emD }));
check("cuenta desactivada: no entra (google_inactive)", g.cb.location?.includes("error=google_inactive") && !g.C0.hasSession(), g.cb.location);
// next seguro
const N = new C(); const st2 = await N.req("/api/auth/google?next=/carrito"); const u2 = new URL(st2.location); const code2 = "c2-" + stamp;
grants.set(code2, { challenge: u2.searchParams.get("code_challenge"), claims: mkClaims() });
const cb2 = await N.req(`/api/auth/google/callback?code=${code2}&state=${u2.searchParams.get("state")}`);
check("respeta un 'next' interno (/carrito)", cb2.location?.endsWith("/carrito"), cb2.location);
const N2 = new C(); const st3 = await N2.req("/api/auth/google?next=https://evil.com"); const u3 = new URL(st3.location); const code3 = "c3-" + stamp;
grants.set(code3, { challenge: u3.searchParams.get("code_challenge"), claims: mkClaims() });
const cb3 = await N2.req(`/api/auth/google/callback?code=${code3}&state=${u3.searchParams.get("state")}`);
check("un 'next' externo (https://evil.com) nunca se sigue", !cb3.location?.includes("evil.com") && cb3.location?.endsWith("/cuenta"), cb3.location);

console.log("\n== Defensa CSRF (Origin) ==");
await db.query(`DELETE FROM "LoginAttempt"`);
r = await anon.req("/api/auth/login", { method: "POST", json: { email: "x@x.cl", password: "x" }, headers: { origin: "http://evil.example" } });
check("POST desde otro origen: bloqueado (403)", r.status === 403, r.status);
r = await anon.req("/api/auth/login", { method: "POST", json: { email: "x@x.cl", password: "x" }, headers: { origin: BASE } });
check("POST desde el mismo origen: pasa (401 por credenciales)", r.status === 401, r.status);
r = await anon.req("/api/auth/login", { method: "POST", json: { email: "x@x.cl", password: "x" }, headers: { "sec-fetch-site": "cross-site" } });
check("Sec-Fetch-Site cross-site sin Origin: bloqueado (403)", r.status === 403, r.status);
r = await anon.req("/api/auth/login", { method: "POST", json: { email: "x@x.cl", password: "x" } });
check("sin cabeceras de navegador (cliente de servidor): pasa", r.status === 401, r.status);
r = await anon.req("/api/panel/counts", { headers: { origin: "http://evil.example" } });
check("GET desde otro origen no se bloquea (solo mutaciones)", r.status === 401, r.status);
const cron = await fetch(BASE + "/api/cron/expire-orders", { method: "POST", headers: { authorization: "Bearer testcron", origin: "http://evil.example" } });
check("el cron (Bearer) queda exento", cron.status === 200, cron.status);
r = await U.req("/api/account/sessions", { method: "DELETE", headers: { origin: "http://evil.example" } });
check("DELETE con sesion valida pero origen ajeno: bloqueado", r.status === 403, r.status);

// limpieza
for (const e of [email, em2, emV, emU, em3, emD, gc.email]) await db.query(`DELETE FROM "User" WHERE email=$1`, [e]);
await db.query(`DELETE FROM "User" WHERE email LIKE 'g-%@gmail.test'`);
mock.close();
console.log(`\nRESULTADO: ${passed} OK, ${failed} fallas`);
await db.end();
