import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { quotationWithRelationsArgs } from "@/types";
import { QuotationPrintView } from "@/components/quotations/QuotationPrintView";

export default async function QuotationPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({ where: { id }, ...quotationWithRelationsArgs });
  if (!quotation) notFound();

  return <QuotationPrintView quotation={quotation} />;
}
