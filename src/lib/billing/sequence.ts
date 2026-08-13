import type { Prisma } from "@/generated/prisma/client";

/** Allocates the next value from a named sequence, inside the caller's
 * transaction, so bill/order numbers stay gapless and race-safe alongside
 * whatever else the transaction is doing. */
export async function allocateSequenceNumber(
  tx: Prisma.TransactionClient,
  name: string,
): Promise<number> {
  const counter = await tx.sequenceCounter.upsert({
    where: { name },
    update: { value: { increment: 1 } },
    create: { name, value: 1 },
  });
  return counter.value;
}
