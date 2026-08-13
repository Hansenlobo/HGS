import { prisma } from "@/lib/prisma";
import { OrderForm } from "@/components/orders/OrderForm";

export default async function NewOrderPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New Order</h1>
        <p className="text-sm text-muted">A picking slip — stock is not affected by saving this.</p>
      </div>
      <OrderForm mode="create" categories={categories} />
    </div>
  );
}
