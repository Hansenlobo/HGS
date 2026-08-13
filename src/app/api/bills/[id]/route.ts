import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { billEditSchema } from "@/lib/validation/bill.schema";
import { billWithRelationsArgs } from "@/types";
import { verifyPin } from "@/lib/adminPin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bill = await prisma.bill.findUnique({ where: { id }, ...billWithRelationsArgs });
  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }
  return NextResponse.json(bill);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = billEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!(await verifyPin(parsed.data.pin))) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }

  const existing = await prisma.bill.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  const { customerName, customerPhone, customerNotes } = parsed.data;

  const bill = await prisma.$transaction(async (tx) => {
    const updated = await tx.bill.update({
      where: { id },
      data: { customerName, customerPhone, customerNotes },
    });
    await tx.billAuditLog.create({
      data: {
        billId: id,
        action: "BILL_EDITED",
        description: "Customer details updated",
        previousValue: JSON.stringify({
          customerName: existing.customerName,
          customerPhone: existing.customerPhone,
          customerNotes: existing.customerNotes,
        }),
        newValue: JSON.stringify({ customerName, customerPhone, customerNotes }),
        performedBy: parsed.data.editedBy,
      },
    });
    return updated;
  });

  const full = await prisma.bill.findUniqueOrThrow({ where: { id: bill.id }, ...billWithRelationsArgs });
  return NextResponse.json(full);
}
