import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { productWithRelationsArgs, supplierWithLedgerArgs } from "@/types";
import { computeSupplierBalance } from "@/lib/suppliers/supplierBalance";
import { SuppliersPageClient } from "@/components/suppliers/SuppliersPageClient";

export default async function SuppliersPage() {
  await requireUser();

  const [suppliers, products] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" }, ...supplierWithLedgerArgs }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, ...productWithRelationsArgs }),
  ]);

  const withBalance = suppliers.map((s) => ({ ...s, balance: computeSupplierBalance(s) }));

  return <SuppliersPageClient initialSuppliers={withBalance} products={products} />;
}
