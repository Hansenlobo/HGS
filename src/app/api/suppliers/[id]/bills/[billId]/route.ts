import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { supplierBillSchema } from "@/lib/validation/supplierBill.schema";
import { supplierWithLedgerArgs } from "@/types";
import { computeSupplierBalance } from "@/lib/suppliers/supplierBalance";
import { logAudit } from "@/lib/audit/log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; billId: string }> },
) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id, billId } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const bill = await prisma.supplierBill.findUnique({ where: { id: billId } });
  if (!bill || bill.supplierId !== id) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = supplierBillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplierBill.update({
      where: { id: billId },
      data: {
        amount: parsed.data.amount,
        reference: parsed.data.reference,
        date: parsed.data.date ? new Date(parsed.data.date) : bill.date,
        notes: parsed.data.notes,
      },
    });

    await logAudit(
      {
        user: { id: auth.user.id, name: auth.user.name },
        module: "Suppliers",
        action: "EDIT_BILL",
        description: `${auth.user.name} edited a bill on supplier "${supplier.name}"`,
        entityType: "Supplier",
        entityId: id,
        detail: { before: bill.amount, after: parsed.data.amount },
      },
      tx,
    );
  });

  const updated = await prisma.supplier.findUniqueOrThrow({ where: { id }, ...supplierWithLedgerArgs });
  return NextResponse.json({ ...updated, balance: computeSupplierBalance(updated) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; billId: string }> },
) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id, billId } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const bill = await prisma.supplierBill.findUnique({ where: { id: billId } });
  if (!bill || bill.supplierId !== id) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplierBill.delete({ where: { id: billId } });

    await logAudit(
      {
        user: { id: auth.user.id, name: auth.user.name },
        module: "Suppliers",
        action: "DELETE_BILL",
        description: `${auth.user.name} deleted a bill of ${bill.amount} on supplier "${supplier.name}"`,
        entityType: "Supplier",
        entityId: id,
      },
      tx,
    );
  });

  const updated = await prisma.supplier.findUniqueOrThrow({ where: { id }, ...supplierWithLedgerArgs });
  return NextResponse.json({ ...updated, balance: computeSupplierBalance(updated) });
}
