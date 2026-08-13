import { prisma } from "@/lib/prisma";
import { billListArgs } from "@/types";
import { BillsPageClient } from "@/components/bills/BillsPageClient";

export default async function BillsPage() {
  const bills = await prisma.bill.findMany({
    orderBy: { createdAt: "desc" },
    ...billListArgs,
  });

  return <BillsPageClient initialBills={bills} />;
}
