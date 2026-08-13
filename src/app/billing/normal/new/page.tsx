import { prisma } from "@/lib/prisma";
import { loadBillPrefill } from "@/lib/billing/prefill";
import { BillForm } from "@/components/billing/BillForm";

export default async function NewNormalBillPage({
  searchParams,
}: {
  searchParams: Promise<{ fromOrder?: string; fromBill?: string; fromQuotation?: string }>;
}) {
  const params = await searchParams;
  const [categories, prefill] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    loadBillPrefill(params),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New Normal Bill</h1>
        <p className="text-sm text-muted">Saving reduces stock immediately.</p>
      </div>
      <BillForm
        billType="NORMAL"
        categories={categories}
        initialLines={prefill.initialLines}
        initialCustomer={prefill.initialCustomer}
        sourceOrderId={prefill.sourceOrderId}
        sourceQuotationId={prefill.sourceQuotationId}
      />
    </div>
  );
}
