import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

// Sin políticas para anon/authenticated: estas tablas solo se consultan desde
// el servidor con el propietario de las tablas o un rol autorizado BYPASSRLS.
const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL });
try {
  await prisma.$transaction([
    prisma.$executeRaw`ALTER TABLE "CheckoutRequest" ENABLE ROW LEVEL SECURITY`,
    prisma.$executeRaw`ALTER TABLE "UsageEvent" ENABLE ROW LEVEL SECURITY`,
    prisma.$executeRaw`ALTER TABLE "UsageReport" ENABLE ROW LEVEL SECURITY`,
  ]);
  console.log("Tablas privadas protegidas con Row Level Security.");
} catch {
  console.error("No se pudo activar RLS en las tablas privadas. Revisa la conexión y los permisos del propietario antes de desplegar.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
