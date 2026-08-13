import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { quotationWithRelationsArgs } from "@/types";
import { QuotationForm } from "@/components/quotations/QuotationForm";

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quotation, categories] = await Promise.all([
    prisma.quotation.findUnique({ where: { id }, ...quotationWithRelationsArgs }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!quotation) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Quotation</h1>
        <p className="text-sm text-muted">Priced like a Party Bill — stock is not affected by saving this.</p>
      </div>
      <QuotationForm mode="edit" quotation={quotation} categories={categories} />
    </div>
  );
}
