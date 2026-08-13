import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addPaymentSchema } from "@/lib/validation/payment.schema";
import { billWithRelationsArgs } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = addPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const bill = await prisma.bill.findUnique({ where: { id } });
  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }
  if (bill.isCancelled) {
    return NextResponse.json({ error: "Cannot add a payment to a cancelled bill" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        billId: id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        notes: parsed.data.notes,
        enteredBy: parsed.data.enteredBy,
      },
    });
    await tx.billAuditLog.create({
      data: {
        billId: id,
        paymentId: payment.id,
        action: "PAYMENT_ADDED",
        description: `Payment of ${parsed.data.amount} (${parsed.data.method}) added`,
        newValue: JSON.stringify({ amount: parsed.data.amount, method: parsed.data.method, notes: parsed.data.notes }),
        performedBy: parsed.data.enteredBy,
      },
    });
  });

  const full = await prisma.bill.findUniqueOrThrow({ where: { id }, ...billWithRelationsArgs });
  return NextResponse.json(full, { status: 201 });
}
