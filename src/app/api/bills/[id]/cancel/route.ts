import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { billCancelSchema } from "@/lib/validation/bill.schema";
import { billWithRelationsArgs } from "@/types";
import { verifyPin } from "@/lib/adminPin";
import { returnStockForLineInTx } from "@/lib/stock/stockAdjustment.service";
import { getCurrentUser } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = billCancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!(await verifyPin(parsed.data.pin))) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  const existing = await prisma.bill.findUnique({
    where: { id },
    include: { lineItems: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }
  if (existing.isCancelled) {
    return NextResponse.json({ error: "Bill is already cancelled" }, { status: 409 });
  }

  const user = await getCurrentUser();

  await prisma.$transaction(async (tx) => {
    for (const line of existing.lineItems) {
      await returnStockForLineInTx(tx, line.id, "Bill cancelled");
    }
    await tx.bill.update({
      where: { id },
      data: {
        isCancelled: true,
        cancelledAt: new Date(),
        cancelledBy: parsed.data.cancelledBy,
        cancelReason: parsed.data.reason,
      },
    });
    await tx.billAuditLog.create({
      data: {
        billId: id,
        action: "BILL_CANCELLED",
        description: parsed.data.reason ?? "Bill cancelled",
        performedBy: parsed.data.cancelledBy,
      },
    });
    await logAudit(
      {
        user,
        module: "Bills",
        action: "CANCEL",
        description: `Cancelled bill ${id}${parsed.data.reason ? `: ${parsed.data.reason}` : ""}`,
        entityType: "Bill",
        entityId: id,
      },
      tx,
    );
  });

  const bill = await prisma.bill.findUniqueOrThrow({ where: { id }, ...billWithRelationsArgs });
  return NextResponse.json(bill);
}
