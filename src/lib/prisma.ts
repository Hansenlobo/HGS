import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return new PrismaClient({
    adapter,
    // Prisma's 5s default interactive-transaction timeout assumed a local
    // SQLite file (near-instant queries). Every query in a $transaction
    // now round-trips to Turso over the network, so multi-step
    // transactions (bill cancel, bill/order/quotation creation, credit
    // account operations, etc.) were timing out mid-transaction.
    transactionOptions: { timeout: 20_000, maxWait: 10_000 },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
