import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/apiGuard";
import { billWithRelationsArgs } from "@/types";
import { getPaidTotal, getPendingAmount } from "@/lib/billing/billDisplay";
import { markPaidSchema } from "@/lib/validation/payment.schema";
import { logAudit } from "@/lib/audit/log";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const bill = await prisma.bill.findUnique({ where: { id }, ...billWithRelationsArgs });
  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }
  if (bill.isCancelled) {
    return NextResponse.json({ error: "Cannot mark a cancelled bill as paid" }, { status: 409 });
  }

  const pending = getPendingAmount(bill.customerAmount, getPaidTotal(bill.payments));
  if (pending <= 0) {
    return NextResponse.json({ error: "Bill is already fully paid" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = markPaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const amount = Math.min(parsed.data.amount, pending);
  const writeOff = pending - amount;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        billId: id,
        amount,
        method: "OTHER",
        notes: "Marked as paid — amount received",
        enteredBy: auth.user.name,
      },
    });
    await tx.billAuditLog.create({
      data: {
        billId: id,
        paymentId: payment.id,
        action: "PAYMENT_ADDED",
        description: `${auth.user.name} manually marked the bill as paid (received ${amount})`,
        newValue: JSON.stringify({ amount, method: "OTHER" }),
        performedBy: auth.user.name,
      },
    });

    if (writeOff > 0) {
      const writeOffPayment = await tx.payment.create({
        data: {
          billId: id,
          amount: writeOff,
          method: "OTHER",
          notes: "Balance written off (Mark as Paid)",
          enteredBy: auth.user.name,
        },
      });
      await tx.billAuditLog.create({
        data: {
          billId: id,
          paymentId: writeOffPayment.id,
          action: "PAYMENT_ADDED",
          description: `${auth.user.name} wrote off the remaining balance (${writeOff})`,
          newValue: JSON.stringify({ amount: writeOff, method: "OTHER" }),
          performedBy: auth.user.name,
        },
      });
    }

    await logAudit(
      {
        user: { id: auth.user.id, name: auth.user.name },
        module: "Bills",
        action: "MARK_PAID",
        description: `${auth.user.name} manually marked bill ${id} as paid (received ${amount}${writeOff > 0 ? `, wrote off ${writeOff}` : ""})`,
        entityType: "Bill",
        entityId: id,
      },
      tx,
    );
  });

  const full = await prisma.bill.findUniqueOrThrow({ where: { id }, ...billWithRelationsArgs });
  return NextResponse.json(full);
}
