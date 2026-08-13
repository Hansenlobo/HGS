import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { returnWithRelationsArgs } from "@/types";
import { ReturnsPageClient } from "@/components/returns/ReturnsPageClient";

export default async function ReturnsPage() {
  await requireUser();

  const returns = await prisma.returnTransaction.findMany({
    orderBy: { createdAt: "desc" },
    ...returnWithRelationsArgs,
  });

  return <ReturnsPageClient initialReturns={returns} />;
}
