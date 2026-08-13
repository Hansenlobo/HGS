import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { productWithRelationsArgs, supplierWithLedgerArgs } from "@/types";
import { computeSupplierBalance } from "@/lib/suppliers/supplierBalance";
import { SupplierDetailClient } from "@/components/suppliers/SupplierDetailClient";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [supplier, products] = await Promise.all([
    prisma.supplier.findUnique({ where: { id }, ...supplierWithLedgerArgs }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, ...productWithRelationsArgs }),
  ]);
  if (!supplier) notFound();

  return (
    <SupplierDetailClient
      initialSupplier={{ ...supplier, balance: computeSupplierBalance(supplier) }}
      products={products}
    />
  );
}
