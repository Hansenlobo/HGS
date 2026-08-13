import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { supplierPaymentSchema } from "@/lib/validation/supplierPayment.schema";
import { supplierWithLedgerArgs } from "@/types";
import { computeSupplierBalance } from "@/lib/suppliers/supplierBalance";
import { logAudit } from "@/lib/audit/log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id, paymentId } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const payment = await prisma.supplierPayment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.supplierId !== id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = supplierPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplierPayment.update({
      where: { id: paymentId },
      data: {
        amount: parsed.data.amount,
        method: parsed.data.method,
        date: parsed.data.date ? new Date(parsed.data.date) : payment.date,
        notes: parsed.data.notes,
      },
    });

    await logAudit(
      {
        user: { id: auth.user.id, name: auth.user.name },
        module: "Suppliers",
        action: "EDIT_PAYMENT",
        description: `${auth.user.name} edited a payment on supplier "${supplier.name}"`,
        entityType: "Supplier",
        entityId: id,
        detail: { before: payment.amount, after: parsed.data.amount },
      },
      tx,
    );
  });

  const updated = await prisma.supplier.findUniqueOrThrow({ where: { id }, ...supplierWithLedgerArgs });
  return NextResponse.json({ ...updated, balance: computeSupplierBalance(updated) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id, paymentId } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const payment = await prisma.supplierPayment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.supplierId !== id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplierPayment.delete({ where: { id: paymentId } });

    await logAudit(
      {
        user: { id: auth.user.id, name: auth.user.name },
        module: "Suppliers",
        action: "DELETE_PAYMENT",
        description: `${auth.user.name} deleted a payment of ${payment.amount} on supplier "${supplier.name}"`,
        entityType: "Supplier",
        entityId: id,
      },
      tx,
    );
  });

  const updated = await prisma.supplier.findUniqueOrThrow({ where: { id }, ...supplierWithLedgerArgs });
  return NextResponse.json({ ...updated, balance: computeSupplierBalance(updated) });
}
