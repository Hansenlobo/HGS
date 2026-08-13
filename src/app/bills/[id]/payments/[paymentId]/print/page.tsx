import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReceiptPrintView } from "@/components/bills/ReceiptPrintView";

export default async function ReceiptPrintPage({
  params,
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const { id, paymentId } = await params;
  const [bill, payment] = await Promise.all([
    prisma.bill.findUnique({ where: { id } }),
    prisma.payment.findUnique({ where: { id: paymentId } }),
  ]);
  if (!bill || !payment || payment.billId !== bill.id) notFound();

  return <ReceiptPrintView bill={bill} payment={payment} />;
}
