import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { productWithRelationsArgs, type ProductWithRelations } from "@/types";
import { isLowStock, isOutOfStock } from "@/lib/stock/stockMetrics";
import { LowStockPageClient } from "@/components/lowStock/LowStockPageClient";

export default async function LowStockPage() {
  await requireUser();

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    ...productWithRelationsArgs,
  });

  const needsRestock = products.filter(
    (product: ProductWithRelations) => isLowStock(product) || isOutOfStock(product),
  );

  return <LowStockPageClient initialProducts={needsRestock} />;
}
