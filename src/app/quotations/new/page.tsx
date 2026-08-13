import { prisma } from "@/lib/prisma";
import { QuotationForm } from "@/components/quotations/QuotationForm";

export default async function NewQuotationPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New Quotation</h1>
        <p className="text-sm text-muted">Priced like a Party Bill — stock is not affected by saving this.</p>
      </div>
      <QuotationForm mode="create" categories={categories} />
    </div>
  );
}
