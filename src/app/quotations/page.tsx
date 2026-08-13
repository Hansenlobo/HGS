import { prisma } from "@/lib/prisma";
import { QuotationsPageClient } from "@/components/quotations/QuotationsPageClient";

export default async function QuotationsPage() {
  const quotations = await prisma.quotation.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <QuotationsPageClient initialQuotations={quotations} />;
}
