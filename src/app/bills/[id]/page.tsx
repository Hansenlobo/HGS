import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { billWithRelationsArgs } from "@/types";
import { BillDetailClient } from "@/components/bills/BillDetailClient";

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bill = await prisma.bill.findUnique({ where: { id }, ...billWithRelationsArgs });
  if (!bill) notFound();

  return <BillDetailClient initialBill={bill} />;
}
