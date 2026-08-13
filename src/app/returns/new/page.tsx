import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { productWithRelationsArgs } from "@/types";
import { ReturnForm } from "@/components/returns/ReturnForm";

export default async function NewReturnPage() {
  await requireUser();

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, ...productWithRelationsArgs }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New Return</h1>
        <p className="text-sm text-muted">Restocks the returned items and records the refund.</p>
      </div>
      <ReturnForm categories={categories} products={products} />
    </div>
  );
}
