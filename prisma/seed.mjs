/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(input) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

const SAMPLES = [
  {
    game: "onepiece",
    type: "SINGLE",
    title: "Roronoa Zoro — OP01-001 (Leader)",
    imageUrl: "https://static.dotgg.gg/onepiece/card/OP01-001.webp",
    price: 12900,
    setName: "Romance Dawn [OP-01]",
    cardNumber: "OP01-001",
    rarity: "L",
    condition: "NM",
    language: "EN",
  },
  {
    game: "onepiece",
    type: "SINGLE",
    title: "Monkey D. Luffy — OP01-024",
    imageUrl: "https://static.dotgg.gg/onepiece/card/OP01-024.webp",
    price: 8500,
    setName: "Romance Dawn [OP-01]",
    cardNumber: "OP01-024",
    condition: "NM",
    language: "EN",
  },
  {
    game: "onepiece",
    type: "SINGLE",
    title: "Portgas D. Ace — OP02-013",
    imageUrl: "https://static.dotgg.gg/onepiece/card/OP02-013.webp",
    price: 15900,
    setName: "Paramount War [OP-02]",
    cardNumber: "OP02-013",
    condition: "NM",
    language: "EN",
    isFoil: true,
  },
  {
    game: "magic",
    type: "SINGLE",
    title: "Sol Ring",
    imageUrl:
      "https://cards.scryfall.io/normal/front/9/1/91fdb56b-54d5-4272-8319-505ff987fe9b.jpg",
    price: 4900,
    setName: "Commander",
    rarity: "uncommon",
    condition: "NM",
    language: "EN",
  },
  {
    game: "magic",
    type: "SINGLE",
    title: "Blacker Lotus",
    imageUrl:
      "https://cards.scryfall.io/normal/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
    price: 22000,
    setName: "Unglued",
    rarity: "rare",
    condition: "EX",
    language: "EN",
  },
  {
    game: "myl",
    type: "SINGLE",
    title: "Julio César — Imperio",
    imageUrl: "https://api.myl.cl/static/cards/44/001.png",
    price: 6500,
    setName: "Imperio",
    cardNumber: "001",
    condition: "NM",
    language: "ES",
  },
  {
    game: "myl",
    type: "SINGLE",
    title: "Espartaco — Imperio",
    imageUrl: "https://api.myl.cl/static/cards/44/002.png",
    price: 3900,
    setName: "Imperio",
    cardNumber: "002",
    condition: "NM",
    language: "ES",
  },
  {
    game: "pokemon",
    type: "SINGLE",
    title: "Charizard — Stormfront",
    imageUrl: "https://assets.tcgdex.net/en/pl/pl4/1/high.webp",
    price: 39900,
    setName: "Stormfront",
    cardNumber: "1",
    condition: "EX",
    language: "EN",
    isFoil: true,
  },
  {
    game: "pokemon",
    type: "SEALED",
    title: "Booster Box sellada — Escarlata y Púrpura",
    imageUrl: "https://assets.tcgdex.net/en/gym/gym2/2/high.webp",
    price: 129900,
    setName: "Escarlata y Púrpura",
    stock: 3,
    language: "ES",
    description:
      "Caja sellada de 36 sobres. Producto original con sello de fábrica intacto.",
  },
];

const DECK = {
  game: "onepiece",
  type: "DECK",
  title: "Mazo competitivo Zoro Rojo — OP01",
  imageUrl: "https://static.dotgg.gg/onepiece/card/OP01-001.webp",
  price: 89900,
  setName: "Romance Dawn [OP-01]",
  condition: "NM",
  language: "EN",
  description:
    "Mazo armado y probado en torneo. Incluye líder, deck completo en sleeves y caja.",
  cards: [
    { id: "OP01-001", name: "Roronoa Zoro (Leader)", qty: 1 },
    { id: "OP01-002", name: "Trafalgar Law", qty: 4 },
    { id: "OP01-013", name: "Sanji", qty: 4 },
    { id: "OP01-016", name: "Nami", qty: 4 },
    { id: "OP01-024", name: "Monkey D. Luffy", qty: 4 },
    { id: "OP01-025", name: "Roronoa Zoro", qty: 4 },
    { id: "OP01-031", name: "Kouzuki Oden", qty: 4 },
    { id: "OP02-013", name: "Portgas D. Ace", qty: 4 },
  ],
};

async function uniqueSlug(model, base) {
  const root = slugify(base) || "item";
  let candidate = root;
  for (let i = 2; i < 100; i++) {
    const found = await model.findUnique({ where: { slug: candidate } });
    if (!found) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@comarcatcg.cl").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "ComarcaTCG2026!";
  const name = process.env.ADMIN_NAME ?? "Comarca TCG";

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", active: true },
    create: {
      email,
      name,
      slug: await uniqueSlug(prisma.user, name),
      password: await bcrypt.hash(password, 12),
      role: "ADMIN",
      city: "Santiago",
      bio: "Tienda oficial de Comarca TCG. Singles, sellados y mazos con envío a todo Chile.",
    },
  });

  console.log(`✔ Administrador listo: ${admin.email}`);

  const existing = await prisma.listing.count();
  if (existing > 0) {
    console.log(`• Ya hay ${existing} publicaciones, se omiten los ejemplos.`);
    return;
  }

  for (const s of SAMPLES) {
    await prisma.listing.create({
      data: {
        ...s,
        stock: s.stock ?? 1,
        slug: await uniqueSlug(prisma.listing, s.title),
        sellerId: admin.id,
        status: "ACTIVE",
      },
    });
  }

  await prisma.listing.create({
    data: {
      game: DECK.game,
      type: "DECK",
      title: DECK.title,
      slug: await uniqueSlug(prisma.listing, DECK.title),
      imageUrl: DECK.imageUrl,
      price: DECK.price,
      stock: 1,
      setName: DECK.setName,
      condition: DECK.condition,
      language: DECK.language,
      description: DECK.description,
      status: "ACTIVE",
      featured: true,
      sellerId: admin.id,
      deckCards: {
        create: DECK.cards.map((c, i) => ({
          externalId: c.id,
          name: c.name,
          imageUrl: `https://static.dotgg.gg/onepiece/card/${c.id}.webp`,
          quantity: c.qty,
          cardNumber: c.id,
          position: i,
        })),
      },
    },
  });

  console.log(`✔ ${SAMPLES.length + 1} publicaciones de ejemplo creadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
