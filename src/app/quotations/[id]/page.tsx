import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { quotationWithRelationsArgs } from "@/types";
import { QuotationDetailClient } from "@/components/quotations/QuotationDetailClient";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({ where: { id }, ...quotationWithRelationsArgs });
  if (!quotation) notFound();

  return <QuotationDetailClient initialQuotation={quotation} />;
}
