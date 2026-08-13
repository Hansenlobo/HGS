import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { billWithRelationsArgs } from "@/types";
import { BillPrintView } from "@/components/bills/BillPrintView";

export default async function BillPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bill = await prisma.bill.findUnique({ where: { id }, ...billWithRelationsArgs });
  if (!bill) notFound();

  return <BillPrintView bill={bill} />;
}
