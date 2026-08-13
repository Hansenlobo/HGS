import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await params;
  const body = await request.json().catch(() => ({}));
  const printedBy: string | undefined = typeof body?.printedBy === "string" ? body.printedBy : undefined;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.billId !== id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  await prisma.billPrintLog.create({
    data: { billId: id, kind: "RECEIPT", paymentId, printedBy },
  });
  return NextResponse.json({ ok: true });
}
