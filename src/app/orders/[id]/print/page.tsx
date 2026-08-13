import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { orderWithRelationsArgs } from "@/types";
import { OrderPrintView } from "@/components/orders/OrderPrintView";

export default async function OrderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.temporaryOrder.findUnique({ where: { id }, ...orderWithRelationsArgs });
  if (!order) notFound();

  return <OrderPrintView order={order} />;
}
