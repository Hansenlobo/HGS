import { prisma } from "@/lib/prisma";
import { orderWithRelationsArgs } from "@/types";
import { OrdersPageClient } from "@/components/orders/OrdersPageClient";

export default async function OrdersPage() {
  const orders = await prisma.temporaryOrder.findMany({
    orderBy: { createdAt: "desc" },
    ...orderWithRelationsArgs,
  });

  return <OrdersPageClient initialOrders={orders} />;
}
