import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { editPaymentSchema, deletePaymentSchema } from "@/lib/validation/payment.schema";
import { billWithRelationsArgs } from "@/types";
import { verifyPin } from "@/lib/adminPin";
import { getCurrentUser } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await params;
  const body = await request.json();
  const parsed = editPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!(await verifyPin(parsed.data.pin))) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!existing || existing.billId !== id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const user = await getCurrentUser();

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { amount: parsed.data.amount, method: parsed.data.method, notes: parsed.data.notes },
    });
    await tx.billAuditLog.create({
      data: {
        billId: id,
        paymentId,
        action: "PAYMENT_EDITED",
        description: "Payment edited",
        previousValue: JSON.stringify({ amount: existing.amount, method: existing.method, notes: existing.notes }),
        newValue: JSON.stringify({ amount: parsed.data.amount, method: parsed.data.method, notes: parsed.data.notes }),
      },
    });
    await logAudit(
      {
        user,
        module: "Payments",
        action: "EDIT",
        description: `Edited payment ${paymentId} on bill ${id}`,
        entityType: "Payment",
        entityId: paymentId,
        detail: { before: existing.amount, after: parsed.data.amount },
      },
      tx,
    );
  });

  const full = await prisma.bill.findUniqueOrThrow({ where: { id }, ...billWithRelationsArgs });
  return NextResponse.json(full);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = deletePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!(await verifyPin(parsed.data.pin))) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!existing || existing.billId !== id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const user = await getCurrentUser();

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    await tx.billAuditLog.create({
      data: {
        billId: id,
        paymentId,
        action: "PAYMENT_DELETED",
        description: `Payment of ${existing.amount} deleted`,
        previousValue: JSON.stringify({ amount: existing.amount, notes: existing.notes }),
      },
    });
    await logAudit(
      {
        user,
        module: "Payments",
        action: "DELETE",
        description: `Deleted payment of ${existing.amount} on bill ${id}`,
        entityType: "Payment",
        entityId: paymentId,
      },
      tx,
    );
  });

  const full = await prisma.bill.findUniqueOrThrow({ where: { id }, ...billWithRelationsArgs });
  return NextResponse.json(full);
}
