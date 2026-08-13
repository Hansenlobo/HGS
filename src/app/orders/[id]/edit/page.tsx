import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { orderWithRelationsArgs } from "@/types";
import { OrderForm } from "@/components/orders/OrderForm";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, categories] = await Promise.all([
    prisma.temporaryOrder.findUnique({ where: { id }, ...orderWithRelationsArgs }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!order) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Order</h1>
        <p className="text-sm text-muted">A picking slip — stock is not affected by saving this.</p>
      </div>
      <OrderForm mode="edit" order={order} categories={categories} />
    </div>
  );
}
