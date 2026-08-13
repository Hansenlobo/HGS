import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productWithRelationsArgs, type ProductWithRelations } from "@/types";
import { isLowStock, isOutOfStock } from "@/lib/stock/stockMetrics";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    ...productWithRelationsArgs,
  });

  const needsRestock = products.filter(
    (product: ProductWithRelations) => isLowStock(product) || isOutOfStock(product),
  );

  return NextResponse.json(needsRestock);
}
