import { prisma } from "@/lib/prisma";
import { productWithRelationsArgs } from "@/types";
import { ProductsPageClient } from "@/components/products/ProductsPageClient";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      ...productWithRelationsArgs,
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return <ProductsPageClient initialProducts={products} initialCategories={categories} />;
}
