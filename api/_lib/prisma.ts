import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.ts";

declare global {
  var __stokkPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Vercel reuses warm serverless instances between invocations; caching the
// client on globalThis avoids exhausting Postgres connections across calls.
export const prisma = globalThis.__stokkPrisma ?? createClient();
globalThis.__stokkPrisma = prisma;
