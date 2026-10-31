// Base PostgreSQL SOLO para pruebas, en memoria (PGlite) y en el puerto 54329. No toca ninguna base real.
// Uso: node tests/test-db.mjs   (déjalo corriendo mientras pruebas)
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const db = await PGlite.create();
const server = new PGLiteSocketServer({ db, port: 54329, host: "127.0.0.1", maxConnections: 20 });
await server.start();
console.log("Base de pruebas lista en postgresql://postgres:postgres@127.0.0.1:54329/postgres");
process.on("SIGINT", async () => { await server.stop(); await db.close(); process.exit(0); });
