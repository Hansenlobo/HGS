import { prisma } from "@/lib/prisma";
import { ClearanceStockPageClient } from "@/components/clearanceStock/ClearanceStockPageClient";

export default async function ClearanceStockPage() {
  const items = await prisma.clearanceItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <ClearanceStockPageClient initialItems={items} />;
}
