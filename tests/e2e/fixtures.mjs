// Datos de prueba para las baterías e2e. Se ejecuta UNA vez sobre una base de pruebas vacía
// (con las tablas ya creadas: `npx prisma db push`). Nunca lo ejecutes contra producción.
//
//   TEST_DB_URL=postgresql://postgres:postgres@127.0.0.1:54329/wctcg_test node tests/e2e/fixtures.mjs
import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const url = process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/wctcg";
if (!/localhost|127\.0\.0\.1/.test(url)) {
  console.error("Por seguridad, estos datos de prueba solo se cargan en una base local:", url);
  process.exit(1);
}
const db = new pg.Client({ connectionString: url });
await db.connect();

const id = (p) => p + crypto.randomBytes(8).toString("hex");
const SELLER_PASS = await bcrypt.hash("AdminTest2026!", 10);
const BUYER_PASS = await bcrypt.hash("ClaveSegura2026", 10);

async function user({ email, name, slug, role, password, createdAt = "2026-01-01" }) {
  const uid = id("u");
  await db.query(
    `INSERT INTO "User"(id,email,name,slug,password,role,active,"createdAt","updatedAt","emailVerifiedAt","termsAcceptedAt","termsVersion")
     VALUES ($1,$2,$3,$4,$5,$6::"Role",true,$7,now(),now(),now(),'2026-09') ON CONFLICT (email) DO NOTHING`,
    [uid, email, name, slug, password, role, createdAt]
  );
  return (await db.query(`SELECT id FROM "User" WHERE email=$1`, [email])).rows[0].id;
}
async function listing(sellerId, title, slug, price, game = "pokemon") {
  await db.query(
    `INSERT INTO "Listing"(id,type,status,game,title,slug,price,stock,condition,language,"sellerId","updatedAt")
     VALUES ($1,'SINGLE','ACTIVE',$2,$3,$4,$5,5,'NM','EN',$6,now()) ON CONFLICT (slug) DO NOTHING`,
    [id("l"), game, title, slug, price, sellerId]
  );
}

const admin = await user({ email: "admin@test.cl", name: "Dream Deck TCG", slug: "dream-deck-tcg", role: "ADMIN", password: SELLER_PASS });
const sipo = await user({ email: "sel_sipo@t.cl", name: "Sipo TCG", slug: "sipo-tcg", role: "SELLER", password: SELLER_PASS });
const nico = await user({ email: "sel_nico@t.cl", name: "Nicolás Rivero", slug: "nicolas-rivero", role: "SELLER", password: SELLER_PASS });
const pink = await user({ email: "sel_pink@t.cl", name: "PokéPink", slug: "pokepink", role: "SELLER", password: SELLER_PASS });
const nuevo = await user({ email: "sel_new@t.cl", name: "Tienda Nueva", slug: "tienda-nueva", role: "SELLER", password: SELLER_PASS });
await user({ email: "b1-fixture@test.cl", name: "Comprador Uno", slug: "comprador-b1", role: "BUYER", password: BUYER_PASS });
await user({ email: "b2-fixture@test.cl", name: "Comprador Dos", slug: "comprador-b2", role: "BUYER", password: BUYER_PASS });

await listing(sipo, "Area Zero Underdepths — 174/142", "area-zero-l1", 14000);
await listing(sipo, "Pikachu ex — 057/191", "pikachu-ex-l1", 17000);
await listing(nico, "Black Lotus — Alpha", "black-lotus-l1", 90000, "magic");
await listing(pink, "Charizard ex — 199/165", "charizard-ex-l1", 25000);
await listing(nuevo, "Monkey D. Luffy — OP05-119", "luffy-op05-l1", 12000, "onepiece");
for (let i = 0; i < 6; i++) await listing(admin, `Carta oficial ${i + 1}`, `carta-oficial-${i + 1}`, 5000 + i * 1000, "magic");

for (const [code, name, price, mf, adv, sc, so] of [
  ["TIENDA", "Tienda", 4990, 6, false, false, 1],
  ["PRO", "Tienda Pro", 7990, 12, true, true, 2],
]) {
  await db.query(
    `INSERT INTO "StorePlan"(id,code,name,"priceMonthly","maxFeatured","advancedStats",showcase,"sortOrder","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now()) ON CONFLICT (code) DO NOTHING`,
    [id("p"), code, name, price, mf, adv, sc, so]
  );
}

await db.query(
  `UPDATE "User" SET "bankName"='Banco Estado', "bankAccountType"='Cuenta Vista', "bankAccountNumber"='123456789', "bankHolderName"='Cuenta Prueba', "bankRut"='11.111.111-1' WHERE role IN ('SELLER','ADMIN')`
);
console.log("Datos de prueba listos: admin@test.cl, 4 vendedores (sel_*@t.cl, clave AdminTest2026!) y compradores b1/b2-fixture@test.cl (clave ClaveSegura2026).");
await db.end();
